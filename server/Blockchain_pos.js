var CryptoJS = require('crypto-js')
var EC = require('elliptic').ec
var ec = new EC('secp256k1')
const { NONAME } = require('dns')
var express = require('express')
var url = require('url')
var cryptico = require('cryptico')
var app = express()
var MongoClient = require('mongodb').MongoClient
var cors = require('cors')
var mongoose = require('mongoose')
const { isNumberObject } = require('util/types')
const { time } = require('console')
const CONNECTION_URL = 'mongodb+srv://ABCD:ABCD$123@cluster0.jcfxe.mongodb.net/?retryWrites=true&w=majority'
const PORT = 5000

class transaction{
    constructor(key, from, to, amount, timestamp) {
        this.from = from
        this.to = to
        this.amount = amount
        this.fee = amount*0.01
        this.timestamp = Date.now()
        this.id = this.hash()
        this.signature = this.sign(key ,from, to, amount, this.fee, timestamp)
    }
    hash = () => {
        return CryptoJS.SHA256(this.from + this.to + this.amount.toString() + this.fee.toString() + this.timestamp.toString()).toString()
    }
    sign = (key ,from, to, amount, fee, timestamp)=>{
        const signingKey = ec.keyFromPrivate(key,'hex')
        const hashtx = CryptoJS.SHA256(from + to + amount.toString() + fee.toString() + timestamp.toString()).toString()
        return signingKey.sign(hashtx,'base64').toDER('hex')
    }
    verify = (publicKey, signature)=>{
        return ec.verify(ec.keyFromPublic(publicKey), signature)
    }
}

class pool{
    constructor(){
        this.pool = new Array()
    }
    add_transaction = (key, from, to, amount)=>{
        var new_transaction = new transaction(key, from, to, amount, Date.now())
        this.pool.push(new_transaction)
        this.pool.sort((a,b)=>a.fee<b.fee)
    }
    remove_transactions = (id) => {
        this.pool.forEach((tx,i)=>{
            if(tx.id == id)
                this.pool.splice(i,1)
        })
    }
    get_next_transaction = ()=>{
        return this.pool.pop()
    }
}

class block{
    constructor(index, validator_key, validator,timestamp, prev_hash, transactions){
        this.index = index
        this.validator = validator
        this.timestamp = timestamp
        this.signature =  ec.keyFromPrivate(validator_key, 'hex').sign(CryptoJS.SHA256(index.toString() + validator + this.timestamp.toString()).toString(), 'base64').toDER('hex')
        this.prev_hash = prev_hash
        this.hash = CryptoJS.SHA256(index.toString() + validator.toString() + this.timestamp.toString() + JSON.stringify(this.transactions) + prev_hash).toString()
        this.transactions = transactions
        this.valid = 1
        this.not_valid = 0
        this.voted = new Set()
        this.voted.add(this.validator)
    }
    // add_transactions = ()=>{
    //     var limit = 4
    //     for(var i = 0; i<limit; i++)
    //     {
    //         this.transactions.push(Mempool.get_next_transaction())
    //     }
    // }
    remove_transactions = () => {
        if(this.transactions)
        this.transactions.forEach((transaction)=>{
            Mempool.pool.add_transaction(transaction)
        })
    }
}

class node{
    constructor(id, password) {
        this.id = id
        this.private_key = this.generate_private_key() 
        this.password = password
        //this.wallets = new Array()
        this.type = 1 // 1->normal 2->validator 3->miner
        this.balance = 0.00
        this.stake = 0.00
        this.coin_age = 10
    }
    generate_private_key = ()=>{
        const keyPair = ec.genKeyPair()
        this.public_key = keyPair.getPublic('hex').toString()
        return keyPair.getPrivate('hex').toString()
    }
}

class blockchain
{
    constructor(){
        this.chain = [{index:0, timestamp:0, prev_hash:'0000000000000000',hash:'0000000000000000'}]
        this.pending = new Array()
        this.nodes = {}
        this.validators = {}
        this.index = 1
        this.no_of_users = 0
        this.no_of_validators = 0
        this.validator_threshold = 0.25
        this.stake_threshold = 5
        this.max_threshold = 50
        this.array_validators = new Array()
    }
    add_user = (id, password)=>{
        var nod = new node(id,password)
        this.nodes[nod.public_key] = nod
        this.no_of_users += 1
        return nod
    }
    remove_user = (public_key)=>{
        delete this.nodes[public_key]
        this.no_of_users -= 1
    }
    add_validator = (key,stake) => {
        if(this.no_of_validators < this.no_of_users*this.validator_threshold &&  stake >= this.stake_threshold && stake <= this.max_threshold)
        {
            if(this.nodes[key].balance - stake > 0)
            {
                this.nodes[key].balance -= stake
                this.nodes[key].stake += stake 
                this.nodes[key].type = 2
                this.validators[key] = this.nodes[key]
                this.no_of_validators += 1
                return 1
            }
            return 0
        }
        return 0
    }
    remove_validator = (key)=> {
        this.nodes[key].balance += this.nodes[key].stake
        this.nodes[key].stake = 0
        this.nodes[key].type = 1
        delete this.validators[key]
        this.no_of_validators -= 1
        return 1
    }
    vote = (validator_key, validator_vote, hash) => {
        if(this.nodes[validator_key].type > 1)
        {
            this.pending.forEach((block)=>{
                if(block.hash == hash && !block.voted.has(validator_key))
                {
                    if(validator_vote == 1)
                        block.valid += 1
                    else
                        block.invalid += 1
                    block.voted.add(validator_key)
                    this.update_chain()
                }
            })
        }
    }
    validate = (transactions)=>{
        var result_array = new Array()
        transactions.forEach((tx)=>{
            if(transaction.verify(tx.from,tx.signature))
            {
                if(this.nodes[tx.from].balance - tx.amount - tx.fee)
                {
                    if(this.nodes.has(tx.to))
                        result_array.push(1)
                    else 
                        result_array.push(0)
                }
                else 
                    result_array.push(0)
            }
            else
                result_array.push(0)
        })
        return result_array
    }

    validate_blocks = (hash) => {
        this.pending.forEach((block)=>{
            if(block.hash == hash)
            {
                return this.validate(block.transactions)
            }
        })
    }

    create_block = ()=>{
        var transactions = new Array()
        var limit = 4
        for(var i = 0; i<limit; i++)
        {
            var next_trans = Mempool.get_next_transaction()
            if(next_trans)
                transactions.push(next_trans)
        }
        return transactions
    }

    get_pending_blocks = (validator_key)=>{
        var pending = new Array()
        this.pending.forEach((block)=>{
            if(!block.voted.has(validator_key))
            {
                pending.push(block)
            }
        })
        return pending
    }
    add_block = (validator_key, validator, transactions)=>{
        if(validator_key == this.get_forger()){
            this.pending.push(new block(this.index,validator_key,validator,Date.now(),this.chain[this.index-1].hash,transactions))
            this.nodes[validator_key].type = 2
            return 1
        }
        else
            return -1
    }
    remove_block = (hash)=>{
        this.pending.forEach((block,i)=>{
        if(block.hash == hash)
            {
                block.remove_transactions()
                this.pending.splice(i,1)
            }
        })
    }
    update_chain = ()=>{
        var threshold = Math.ceil(0.5*this.no_of_validators)
        this.pending.forEach((block)=>{
            if(block.valid >= threshold)
            {
                this.chain.push(block)
                this.pending.forEach((b,i)=>{
                    if(b.index == block.index)
                        this.pending.splice(i,1)
                })
                this.update_funds(block.transactions)
                this.index += 1
            }
        })
    }
    update_funds = (transactions)=>{
        console.log(typeof(transactions))
        if(transactions)
        transactions.forEach((tx)=>{
            this.nodes[tx.from].balance -= tx.amount+tx.fee
            this.nodes[tx.to].balance += tx.amount
            this.nodes[tx.validator].balance += tx.fee
        })
    }

    return_validators_list = ()=>{
        return this.array_validators
    }

    get_forger = () => { // this function will return the details of the forger
        var total = 0; // this is the normalization factor for the weights
        // this for loop is to calculate the normalization factor and to create an array from the set
        for (var key in this.validators) {
            total += this.validators[key].stake * this.validators[key].coin_age
            this.array_validators.push(this.validators[key])
        }
        
        var weights = [] // this array will store all the weights of the validators for sampling
        for (var key in this.array_validators) {
            weights.push((this.array_validators[key].stake * this.array_validators[key].coin_age / total))
        }
        function weightedRandom(prob) {
            var i, sum = 0, r = Math.random();
            for (i = 0; i < prob.length; ++i) {
                sum += prob[i];
                if (r <= sum) {
                    return i
                }
            }
        }
        var index = weightedRandom(weights) // get the index of the forger
        var key_to_look_for = this.array_validators[index].public_key; // this variable stores the required key so that we can the user's type
        for (var key in this.nodes) {
            if (this.nodes[key].public_key == key_to_look_for) {
                this.nodes[key].type = 3
            } 
        }
        // this is the select forger
        return this.array_validators[index].public_key
    }

}

var app = express()
app.use(express.json());
app.use(express.urlencoded());
const Blockchain = new blockchain()
const Mempool = new pool()
//Account creation
app.post('/signup', (req, res) => {
    console.log(req.body)
    if(Blockchain.add_user(req.body.email, req.body.password))
        res.send({'message':'Successful!'})
    else 
    {
        res.status(500)
        res.send({'message':'Internal Server Error'})
    }
    
})
app.post('/login', (req, res) => {
    for(i in Blockchain.nodes)
    {
        if(Blockchain.nodes[i].id == req.body.email && Blockchain.nodes[i].password == req.body.password)
            res.send({'Message':'Login Successful!',wallets:Blockchain.nodes[i], success: 1})
    }    
})

app.post('/chose_wallet',(req,res)=>{
    for(i in Blockchain.nodes)
    {
        if(Blockchain.nodes[i].id == req.body.id)
        {
            res.send({'public_key':Blockchain.nodes[i].public_key})
        }
    }
})

app.post('/create_transaction',(req,res)=>{
    Mempool.add_transaction(req.body.key,req.body.from,req.body.to,Number(req.body.amount))
    res.send({'Message':'Transaction added successfully'})
})

app.get('/get_chain',(req,res)=>{
    res.send({'chain':Blockchain.chain})
})

app.get('/get_validators',(req,res)=>{
    res.send({'Validators':Blockchain.return_validators_list()})
})

app.post('/get_pending_blocks',(req,res)=>{
    res.send({'Blocks':Blockchain.get_pending_blocks(req.body.validator_key)})
})

app.post('/getTrans', (req,res)=>{
    res.send({'transactions':Blockchain.create_block()})
})

app.post('/get_more',(req,res)=>{
    console.log()
    var reward = Math.random()*10
    var balance
    for(i in Blockchain.nodes)
    {
        if(Blockchain.nodes[i].public_key == req.body.public_key)
        {
            Blockchain.nodes[i].balance += reward
            balance = Blockchain.nodes[i].balance
        }
    }
    res.send({message:('Hurray!you received a reward of '+reward+' coins'),balance:balance})
})

app.post('/validateTrans', (req, res) => {
    res.send({"valid_or_not" : Blockchain.validate(JSON.parse(res.body.tList))})
})

app.post('/get_signature', (req, res) => { 
    var trans = JSON.parse(req.body.selectedTrans)
    Blockchain.add_block(req.body.publicKey, trans)
    res.send("Success")
})

app.post('/votes', (req, res) => {
    var public_key = JSON.parse(req.body.publicKey)
    var validator_vote = req.body.vote
    Blockchain.vote(public_key, validator_vote, req.body.hash)
})

app.listen(PORT)