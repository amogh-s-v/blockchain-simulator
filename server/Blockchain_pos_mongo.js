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
const CONNECTION_URL = 'mongodb://127.0.0.1:27017/'
const PORT = 5000

class transaction{
    constructor(key, from, to, amount, timestamp) {
        this.from = from
        this.to = to
        this.amount = amount
        this.fee = amount*0.01
        this.timestamp = timestamp
        this.id = this.hash()
        this.signature = this.sign(key ,from, to, amount, this.fee, timestamp)
        this.status = 0 // 0->pending 1->confirmed -1->invalidated
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
    add_transaction = (tx)=>{
        MongoClient.connect(CONNECTION_URL,(err,client)=>{
            if(err) throw err
            var col = client.db('Blockchain').collection('pool')
            col.insertOne({_id:tx.id,from:tx.from,to:tx.to,amount:tx.amount,fee:tx.fee,timestamp:tx.timestamp,signature:tx.signature,status:tx.status})
            .then(()=>{
                client.close()
            })
        })
    }
    remove_transactions = (id) => {
        MongoClient.connect(CONNECTION_URL,(err,client)=>{
            if(err) throw err 
            var col = client.db('Blockchain').collection('pool')
            col.deleteOne({_id:id}).then(()=>client.close())
        })
    }
    hash = (transaction) => {
        return CryptoJS.SHA256(transaction.from + transaction.to + transaction.amount.toString() + transaction.fee.toString() + transaction.timestamp.toString()).toString()
    }
    sign = (key ,from, to, amount, fee, timestamp)=>{
        const signingKey = ec.keyFromPrivate(key,'hex')
        const hashtx = CryptoJS.SHA256(from + to + amount.toString() + fee.toString() + timestamp.toString()).toString()
        return signingKey.sign(hashtx,'base64').toDER('hex')
    }
    verify = (publicKey, signature, id)=>{
        var public_ = ec.keyFromPublic(publicKey,'hex')
        return public_.verify(id, signature)
    }
}

class block{
    constructor(index, signature, validator,timestamp, prev_hash, transactions){
        this.index = index
        this.validator = validator
        this.timestamp = timestamp
        this.signature =  signature
        this.prev_hash = prev_hash
        this.hash = CryptoJS.SHA256(index.toString() + validator.toString() + this.timestamp.toString() + JSON.stringify(this.transactions) + prev_hash).toString()
        this.transactions = transactions
        this.valid = 1
        this.not_valid = 0
        this.voted_for = new Set()
        this.voted_against = new Set()
        this.status = 0 //0->pending 1->approved -1->invalidated
        this.voted_for.add(this.validator)
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
        this.chain = []
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
        this.no_of_users += 1
        MongoClient.connect('mongodb://127.0.0.1:27017/',(err,client)=>{
            if(err) throw err 
            var col = client.db('Blockchain').collection('users')
            col.insertOne({_id:nod.public_key,public_key:nod.public_key,private_key:nod.private_key,password:nod.password,id:nod.id,balance:nod.balance,stake:nod.stake,type:nod.type,coin_age:nod.coin_age})
            .then(()=>client.close())
        })
        return nod
    }
    remove_user = (public_key)=>{
        MongoClient.connect('mongodb://127.0.0.1:27017/',(err,client)=>{
            if(err) throw err 
            var col = client.db('Blockchain').collection('users')
            col.deleteOne({_id:public_key}).then(()=>{this.no_of_users -= 1; client.close()})
        })
    }
    // add_validator = (key,stake) => {
    //     if(this.no_of_validators < this.no_of_users*this.validator_threshold &&  Number(stake) >= this.stake_threshold && Number(stake) <= this.max_threshold)
    //     {
    //         if(this.nodes[key].balance - Number(stake) > 0)
    //         {
    //             this.nodes[key].balance -= Number(stake)
    //             this.nodes[key].stake += Number(stake) 
    //             this.nodes[key].type = 2
    //             this.validators[key] = this.nodes[key]
    //             this.no_of_validators += 1
    //             //to be discussed
    //             if(this.no_of_validators == 1)
    //                 this.nodes[key].type = 3
    //             return this.nodes[key]
    //         }
    //         return null
    //     }
    //     return null
    // }
    remove_validator = (key)=> {
        MongoClient.connect(CONNECTION_URL,(err,client)=>{
            if(err) throw err 
            var col = client.db('Blockchain').collection('users')
            col.findOne({_id:key},(err,doc)=>{
                if(err) throw err 
                var new_bal = Number(doc.balance) + Number(doc.stake)
                col.updateOne({_id:key},{$set:{balance:new_bal, stake: 0, type: 1}}).then(()=>{
                    client.close()
                })
            })
        })
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
        
        transactions.forEach((tx)=>{
            if(!(tx.from in balances))
                balances[tx.from] = this.nodes[tx.from].balance
        })
        transactions.forEach((tx)=>{
            if(Mempool.verify(tx.from,tx.signature, tx.id))
            {
                balances[tx.from] = balances[tx.from] - Number(tx.amount) - Number(tx.fee)
                if(balances[tx.from] >= 0)
                {
                    if(tx.to in this.nodes)
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

    add_block = (signature, validator, timestamp, transactions)=>{
        
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
        var threshold = Math.ceil(0.51*this.no_of_validators)
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
            this.nodes[tx.from].balance -= Number(tx.amount)+Number(tx.fee)
            this.nodes[tx.to].balance += Number(tx.amount)
            this.nodes[tx.validator].balance += Number(tx.fee)
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
        console.log(this.array_validators)
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

MongoClient.connect(CONNECTION_URL,(err,client)=>{
    if(err) throw err 
    client.db('Blockchain').collection('users').countDocuments({}).then((val)=>{
        Blockchain.no_of_users = val
    })
    client.db('Blockchain').collection('users').countDocuments({$or: [{type:'2'},{type:'3'}]}).then((val)=>{
        Blockchain.no_of_validators = val
    })
    client.db('Blockchain').collection('chain').insertOne({_id:'0'.repeat(256),timestamp:Date.now(),prev_hash:'0'.repeat(256),index:0,status:1,hash:'0'.repeat(256)},(err,doc)=>{
        if(err) client.close()
        else client.close()
    })
})


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
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err
            var col = client.db('Blockchain').collection('users')
            col.findOne({id:req.body.email,password:req.body.password},(err,docs)=>{
                if(!docs) res.send({'Message':'Invalid Login credentials!'})
                else res.send({'Message':'Login Successful!',wallets:docs, success:1})
            })
    }) 
})

app.post('/chose_wallet',(req,res)=>{
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err
        var col = client.db('Blockchain').collection('users')
        col.findOne({id: req.body.id}, (err, docs)=>{
            if(!docs) res.send({'Message':'User does not exist'})
            else res.send({'public_key': docs._id, 'Message':""})
        })
    })
})

app.post('/create_transaction',(req,res)=>{
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err
        var tx = new transaction(req.body.key, req.body.from, req.body.to, Number(req.body.amount), req.body.timestamp)
        var col = client.db('Blockchain').collection('pool')
        col.insertOne({_id:tx.id,from:tx.from,to:tx.to,amount:tx.amount,fee:tx.fee,timestamp:tx.timestamp,signature:req.body.signature,status:tx.status})
        .then(()=>{
            client.close()
            res.send({'Message':'Transaction added successfully'})
        })
    })
})

app.post('/get_pool',(req,res)=>{
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err
        var col = client.db('Blockchain').collection('pool')
        col.find({}).toArray((err,docs)=>{
            if(err) throw err 
            client.close()
            res.send({'Pool':docs})
        })
    })
})

app.get('/get_chain',(req,res)=>{
    MongoClient.connect(CONNECTION_URL, (err,client)=>{
        var col = client.db('Blockchain').collection('chain')
        col.find({status:1}).toArray((err,docs)=>{
            client.close()
            if(err) res.send({'Message':'No blocks yet!!'})
            res.send({'Message':'Successful!','Blocks':docs})
        })
    })
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
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err
        var reward = Math.random()*10
        var col = client.db('Blockchain').collection('users')
        col.findOne({_id:req.body.public_key},(err,doc)=>{
            if(err) throw err
            var balance = doc.balance+reward
            col.updateOne({_id:req.body.public_key}, {$set: {balance:balance}}).then(()=>{
                client.close()
                res.send({'Message':('Hurray!you received a reward of '+reward+' coins'), balance:balance, stake:doc.stake, type: doc.type})
            })
        })
    })
    
})

app.post('/validateTrans', (req, res) => {
    var result_array = new Array()
    var balances = {}
    console.log("request", req.body)
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        client.db('Blockchain').collection('users').find({}).toArray((err,docs)=>{
                if(err) throw err
                docs.forEach((user)=>{
                    balances[user.public_key] = user.balance
                })
                
                req.body.tList.forEach((tx)=>{
                    if(Mempool.verify(tx.from,tx.signature, tx._id))
                    {
                        console.log("1st if")
                        
                        balances[tx.from] = balances[tx.from] - Number(tx.amount) - Number(tx.fee)
                        if(balances[tx.from] >= 0)
                        {
                            
                            if(tx.to in balances)
                            {
                                console.log("last if")
                                result_array.push(1)
                            }
                            else 
                            {
                                result_array.push(0)
                                
                            }
                        }

                        else 
                        {
                            result_array.push(0)
                            balances[tx.from] = balances[tx.from] + Number(tx.amount) + Number(tx.fee)
                        }
                    }
                    else
                        result_array.push(0)
                })
                res.send({"valid_or_not" : result_array})
            })
        })
})

app.post('/add_block', (req, res) => {
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        if(err) throw err 
        var col = client.db('Blockchain').collection('chain')
        var new_block = new block(Blockchain.index,req.body.signature,req.body.public_key,req.body.timestamp,req.body.prev_hash,req.body.selectedTrans) //prev hash 

        col.insertOne({_id:new_block.hash,index:new_block.index,validator:new_block.validator,timestamp:new_block.timestamp,
                        signature:new_block.signature,transactions:new_block.transactions,valid:new_block.valid,invalid:new_block.not_valid,
                        voted_for:new_block.voted_for,voted_against:new_block.voted_against,status:new_block.status,hash:new_block.hash})
            .then(()=>{client.close();res.send({"Message":"Success"})})
    }) 
})

app.post('/get_signature',(req,res)=>{
    var timestamp = Date.now()
    res.send({'Message':'Signature generated!','signature':ec.keyFromPrivate(req.body.private_key, 'hex').sign(CryptoJS.SHA256(Blockchain.index + req.body.public_key + timestamp.toString()).toString(), 'base64').toDER('hex'),
                'timestamp':timestamp})
})

app.post('/get_signature_transaction',(req,res)=>{
    var timestamp = Date.now()
    res.send({'Message':'Signature generated!','signature':Mempool.sign(req.body.private_key,req.body.public_key,req.body.to,req.body.amount,
                (Number(req.body.amount)*0.01).toString(),timestamp),
                'timestamp':timestamp})
})

app.post('/votes', (req, res) => {
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
        var col = client.db('Blockchain').collection('chain')
        col.findOne({_id:req.body.hash}, (err,doc)=>{
            if(err) res.send({'Message':'Invalid!'})
            else{
            if(req.body.vote == 1)
            {
                doc.voted_for.add(req.body.public_key)
                doc.valid += 1
                if(doc.valid>Math.ceil(Blockchain.no_of_validators*0.51))
                    doc.status = 1
            }
            else
            {
                doc.voted_against.add(req.body.public_key)
                doc.not_valid += 1
                if(doc.not_valid>Math.ceil(Blockchain.no_of_validators*0.51))
                    col.deleteOne({_id:doc.hash})
            }
            col.updateOne({_id:doc.hash},{$set: {voted_for:doc.voted_for,voted_against:doc.voted_against,
                            valid:doc.valid,not_valid:doc.not_valid,status:doc.status}},(err,doc)=>{
                    var trans = client.db('Blockchain').collection('pool')
                    doc.transactions.forEach((tx)=>{
                        trans.findOneAndUpdate({_id:tx.hash},{$set: {status:doc.status==1?1:0}})
                    })
                    client.close()
            })
        }
        })
    })
})

app.post('/addStake',(req,res)=>{
    MongoClient.connect(CONNECTION_URL,(err,client)=>{
            var col = client.db('Blockchain').collection('users')
            var stake = Number(req.body.stake)
            col.findOne({_id:req.body.public_key}, (err,doc)=>{
                if(err) throw err
                
            console.log(Blockchain.no_of_validators, Blockchain.no_of_users, Blockchain.validator_threshold, stake, Blockchain.stake_threshold, Blockchain.max_threshold)
            if(Blockchain.no_of_validators < Blockchain.no_of_users*Blockchain.validator_threshold && stake >= Blockchain.stake_threshold && stake <= Blockchain.max_threshold)
            {
                if(doc.balance - stake > 0)
                {
                    doc.balance -= stake
                    doc.stake += stake 
                    doc.type = 2
                    Blockchain.no_of_validators += 1
                    //to be discussed
                    if(Blockchain.no_of_validators == 1)
                        doc.type = 3
                    col.updateOne({_id:doc.public_key},{$set: {balance:doc.balance,stake:doc.stake,type:doc.type}})
                    .then(()=>{
                        client.close()
                        res.send({'Message':'Successful','balance':doc.balance,'stake':doc.stake,'type':doc.type})
                    })
                }
                else{
                    client.close()
                    res.send({'Message':'Insufficient Funds','balance':doc.balance,'stake':doc.stake,'type':doc.type})
                }
            }
            else{
                client.close()
                res.send({'Message':'You cannot become a validator now!','balance':doc.balance,'stake':doc.stake,'type':doc.type})
            }
        })
    })
})

app.post('/get_details',(req,res)=>{
    console.log(req.body)
    MongoClient.connect(CONNECTION_URL, (err,client)=>{
        var col = client.db('Blockchain').collection('users')
        col.findOne({_id:req.body.public_key},(err,doc)=>{
            if(!doc) res.send({'Message':'Invalid!'})
            else res.send({'Message':'Successful!', balance:doc.balance, stake:doc.stake, type:doc.type})
            client.close()
        })
    })
})

app.post('/isMiner',(req,res)=>{

    res.send({'message':'You are not a miner'})
})



app.listen(PORT)
