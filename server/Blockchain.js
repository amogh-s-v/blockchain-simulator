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
const PORT = process.env.PORT || 5000

class transaction{
    constructor(key, from, to, amount, timestamp) {
        this.from = from
        this.to = to
        this.amount = amount
        this.fee = amount*0.01
        this.timestamp = timestamp
        this.id = hash(this)
        this.signature = sign(key ,from, to, amount, this.fee, timestamp)
    }
    hash = (tx) => {
        return CryptoJS.SHA256(tx.from + tx.to + tx.amount.toString() + tx.fee.toString() + tx.timestamp.toString()).toString()
    }
    sign = (key ,from, to, amount, fee, timestamp)=>{
        const signingKey = ec.keyFromPrivate(key,'hex')
        const hashtx = CryptoJS.SHA256(from + to + amount.toString() + fee.toString() + timestamp.toString()).toString()
        return signingKey.sign(hashtx,'base64').toDER('hex')
    }
    verify = (publicKey, tx)=>{
        return ec.verify(ec.keyFromPublic(publicKey), tx.signature())
    }
}

class pool{
    constructor(){
        this.pool = new Array()
    }
    add_transaction = (key, from, to, amount, timestamp)=>{
        this.pool.push(transaction(key, from, to, amount, timestamp))
    }
    remove_transactions = (id) => {
        this.pool.forEach((transaction, i)=>{
            if(transaction.id == id)
                this.pool.splice(i,1)
        })
    }
}

class block{
    constructor(index, validator_key, validator, timestamp, prev_hash, transactions){
        this.index = index
        this.validator = validator
        this.timestamp = timestamp
        this.signature =  ec.keyFromPrivate(validator_key, 'hex').sign(CryptoJS.SHA256(index.toString() + validator + timestamp.toString()).toString(), 'base64').toDER('hex')
        this.prev_hash = prev_hash
        this.hash = CryptoJS.SHA256(index.toString() + validator.toString() + timestamp.toString() + JSON.stringify(this.transactions) + prev_hash).toString()
        this.transactions = transactions
        this.valid = 1
    }
    add_transactions = (transaction)=>{
        this.transactions.push(transaction)
    }
    remove_transactions = () => {
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
        this.coin_age = 0
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
        if(this.no_of_validators < this.no_of_users*this.validator_threshold &&  stake >= this.stake_threshold)
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
    add_block = (validator_key, validator, transactions)=>{
        this.pending.push(new block(this.index,validator_key,validator,Date.now(),this.chain[this.index-1].hash,transactions))
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
        this.pending.forEach((block,i)=>{
            if(block.valid >= threshold)
            {
                this.chain.push(block)
                this.pending.splice(i,1)
                this.update_funds(block.transactions)
            }
        })
    }
    free_transaction = (transactions)=>{
        
    }
    update_funds = (transactions)=>{
        if(transactions)
        transactions.forEach((tx)=>{
            this.nodes[tx.from].balance -= tx.amount+tx.fee
            this.nodes[tx.to].balance += tx.amount
        })
    }
    stake = (uid) => {

    }
    proof_of_stake = ()=>{

    }
}

const Blockchain = new blockchain()


app.post('/signup', (req, res) => {
    console.log(req.body.email)
    var node = Blockchain.add_user(req.body.email, req.body.password)
    res.send({ 'message': 'User Added', 'Name': node.id, 'type': node.type, 'private_key': node.private_key, 'balance': node.balance, 'stake': node.stake})
})

app.post('/login', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        var col = client.db('Blockchain').collection('users')
        var wals = client.db('Blockchain').collection('wallets')
        col.findOne({ id: req.body.email }, (err, user) => {
            if (user) {
                if (req.body.password === user.password) {
                    wals.find({ uid: user._id }).toArray((err, docs) => {
                        console.log()
                        res.send({ message: 'Login Successful', wallets: docs, success: 1 })
                    })
                } else {
                    res.send({ message: "Password didn't match", success: 0 })
                }
            }
            else {
                res.send({ message: "User not registered", success: 0 })
            }
            //client.close()
        })
    })
})

// var Blockchain = new blockchain()
// var pk = Blockchain.add_user('abc','1')
// Blockchain.add_user('abd','1')
// Blockchain.nodes[pk].balance = 10
// Blockchain.add_validator(pk,5)
// Blockchain.remove_validator(pk)
// Blockchain.add_block(Blockchain.nodes[pk].public_key, pk, null)
// console.log(Blockchain.nodes)
// console.log(Blockchain.pending)
// Blockchain.update_chain()
// console.log(Blockchain.chain)