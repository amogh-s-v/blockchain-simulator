var CryptoJS = require('crypto-js')
const { NONAME } = require('dns')
var express = require('express')
var url = require('url')
var cryptico = require('cryptico')
var app = express()
var MongoClient = require('mongodb').MongoClient
var cors = require('cors')
const { isNumberObject } = require('util/types')
const CONNECTION_URL = 'mongodb://localhost:27017'
const PORT = process.env.PORT || 5000

app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

String.prototype.hexEncode = function () {
    var hex, i;

    var result = "";
    for (i = 0; i < this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }

    return result
}

class storage {
    constructor() {
        this.pool = new Array()
        this.index = 0
    }
    transac_hash = (from, to, amount, fee, timestamp) => {
        console.log('after calling', amount)
        return CryptoJS.SHA256(from + to + amount.toString() + fee.toString() + timestamp).toString()
    }
    add_transaction = (from, to, amount, fee) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('pool')
            var timestamp = Date.now()
            console.log('hash',this.transac_hash(from, to, amount, fee, timestamp))
            col.insertOne({ _id: this.transac_hash(from, to, amount, fee, timestamp).substring(0,32), 'from': from, 'to': to, 'amount': amount, 'fee': fee })
                .then(() => { client.close() })
            this.pool.push({ _id: this.transac_hash(from, to, amount, fee, timestamp).substring(0,32), 'from': from, 'to': to, 'amount': amount, 'fee': fee })
            this.index += 1
        })
    }
    release_transaction = (id) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('pool')
            console.log('1245', id)
            col.findOne({ _id: id }, (err, docs) => {
                var transaction = docs
                col.deleteOne({ _id: id }).then(() => {
                    var i = 0
                    while (i < this.pool.length) {
                        if (this.pool[i]._id == id) {
                            console.log('loop', this.pool[i])
                            this.pool.splice(i, 1)
                        }
                        i += 1
                    }
                    client.close()
                })
            })
        })
    }
}

class Transaction {
    constructor(from, to, amount, fee) {
        this.from = from
        this.to = to
        this.amount = amount
        this.fee = fee
    }
}

class node {
    constructor(id, password) {
        this.id = id
        this._id = this.create_uid()//unique to the user
        this.password = password
        this.wallets = new Array()
    }
    create_uid = () => {
        var dt = new Date().getTime();
        var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
    get_main_wallet = () => {
        var walletsRSAkey = cryptico.generateRSAKey(this.id, 1024)
        var walletspublickey = CryptoJS.SHA256(cryptico.publicKeyString(walletsRSAkey)).toString()
        var wallet = {
            'uid': this._id,//id of the user
            'id': this.id,//name of the wallet
            '_id': walletspublickey.substring(0,32),//unique to the wallet
            'balance': 0.00,
            'publicKey': walletspublickey
        }
        Blockchain.wallets.push({_id:wallet._id,bal:wallet.balance})
        return wallet
    }
}

class block {
    constructor(index, proof, timestamp, previous_hash) {
        this.index = index
        this.proof = proof
        this.timestamp = timestamp
        this.transactions = new Array()
        this.previous_hash = previous_hash
        this.hash = CryptoJS.SHA256(index.toString() + proof.toString() + timestamp.toString() + JSON.stringify(this.transactions) + previous_hash).toString()
    }
    manual_transaction = (transaction, node_address, wallets) => {
        var i = 0
        console.log(wallets)
        while (i < transaction.length) {
            //console.log('hello')
            transaction[i]._id = Mempool.transac_hash(transaction[i].from, transaction[i].to, transaction[i].amount, transaction[i].fee, transaction[i].timestamp)
            this.transactions.push(transaction[i])
            wallets.forEach((wallet) => {
                if (wallet._id == transaction[i].from) {
                    wallet.bal -= transaction[i].amount + transaction[i].fee
                    console.log('Nan', Number(transaction[i].amount), transaction[i].fee)
                }
                else if (wallet._id == transaction[i].to)
                    wallet.bal += transaction[i].amount
                else if (wallet._id == node_address)
                    wallet.bal += 12.5
            })
            console.log(transaction[i]._id)
            Mempool.release_transaction(transaction[i]._id)
            i += 1
        }
        Blockchain.update_wallets()
        //reward.bal += 12.5
        this.transactions.push({ _id: Mempool.transac_hash('system', node_address, 12.5, 0.00), from: 'system', to: node_address, amount: 12.5, fee: 0, timestamp: Date.now() })
    }
    add_transaction = (node_address, wallets) => {
        var pool = Mempool.pool.sort((a, b) => a.fee - b.fee)
        var i = 4
        var rewarded = 0
        var tot_fee = 0
        while (i > 0 && pool.length > 0) {
            this.transactions.push(pool.pop())
            wallets.forEach((wallet) => {
                if (wallet._id == this.transactions[4 - i].from) {
                    tot_fee += Number(this.transactions[4 - i].fee)
                    //wallet.bal -= Number(this.transactions[4 - i].amount) + Number(this.transactions[4 - i].fee)
                    console.log('Nan', node_address)
                }
                else if (wallet._id == this.transactions[4 - i].to) {
                    tot_fee += Number(this.transactions[4 - i].fee)
                    wallet.bal += Number(this.transactions[4 - i].amount)
                }
                if (wallet._id == node_address && !rewarded) {
                    console.log('equal')
                    wallet.bal += Number('12.5')+tot_fee
                    rewarded = 1
                }
            })
            Mempool.release_transaction(this.transactions[4 - i]._id)
            i = i - 1
        }
        if (!rewarded)
            wallets.forEach((wallet) => {
                if (wallet._id == node_address) {
                    wallet.bal += Number('12.5')+tot_fee
                }
            })
        this.transactions.push({ _id: Mempool.transac_hash('system', node_address, 12.5 + tot_fee, 0.00, Date.now()).substring(0,32), from: 'system', to: node_address, amount: 12.5, fee: 0 })
        console.log(wallets)
        Blockchain.update_wallets()
        this.hash = CryptoJS.SHA256(this.index.toString() + this.proof.toString() + this.timestamp.toString() + JSON.stringify(this.transactions) + this.previous_hash).toString()
    }
    release_transaction = (node_address) => {
        while (i < this.transactions.length) {
            Blockchain.wallets.forEach((wallet) => {
                if (wallet._id == this.transactions[i].from) {
                    wallet.bal += Number(this.transactions[i].amount) + Number(this.transactions[4 - i].fee)
                    //console.log('Nan', this.transactions[4 - i].amount + this.transactions[4 - i].fee)
                }
                else if (wallet._id == this.transactions[4 - i].to)
                    wallet.bal -= Number(this.transactions[4 - i].amount)
                else if (wallet._id == node_address)
                    wallet.bal -= Number('12.5')
            })
            i += 1
        }
    }
    updateTrans = ()=>{
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            console.log('updating...')
            var index = this.index
            var col = client.db('Blockchain').collection('blocks')
            this.transactions.forEach((transaction)=>{
                col.insertOne({ blockno: index,from: transaction.from, to: transaction.to, amount: transaction.amount, fee: transaction.fee })
            })
            //client.close()
        })
    }
}

class blockchain {
    constructor() {
        this.chain = new Array()
        this.create_block(1, '0', null)
        this.difficulty = 4
        this.transactions = new Array()
        this.nodes = new Set()
        this.wallets = new Array()
    }
    create_block = (proof, previous_hash) => {
        var Block = new block(this.chain.length + 1, proof,
            Date.now(), previous_hash)
        this.chain.push(Block)
        return Block
    }
    get_previous_block = () => {
        console.log(this.chain[this.chain.length - 1])
        return this.chain[this.chain.length - 1]
    }
    proof_of_work = (previous_proof) => {
        var new_proof = 1
        var check_proof = false
        var control_str = '0000000000000000000'
        while (!check_proof) {
            var hash_operation = CryptoJS.SHA256((new_proof * new_proof - previous_proof * previous_proof).toString()).toString()
            if (hash_operation.slice(0, this.difficulty) == control_str.slice(0, this.difficulty))
                check_proof = true
            else
                new_proof += 1
        }
        return new_proof
    }
    hash = (Block) => {
        var transaction = JSON.stringify(Block.transactions)
        return CryptoJS.SHA256(Block.index + Block.proof + Block.timestamp + transaction + Block.previous_hash).toString()
    }
    is_chain_valid = (chain) => {
        previous_block = chain[0]
        block_index = 1
        while (block_index < chain.length) {
            var Block = chain[block_index]
            if (Block.previous_hash != this.hash(previous_block))
                return false
            var previous_proof = previous_block.proof
            var proof = Block.proof
            var hash_operation = CryptoJS.SHA256((proof * proof - previous_proof * previous_proof).toString()).toString()
            if (hash_operation.slice(0, this.difficulty) != control_str.slice(0, this.difficulty))
                return false
            previous_block = Block
            block_index += 1
        }
        return true
    }
    add_transaction = (sender, receiver, amount, fee) => {
        this.transactions.push(new Transaction(sender, receiver, amount, fee))
        console.log('calling', amount)
        Mempool.add_transaction(sender, receiver, amount, fee)
        var previous_block = this.get_previous_block()
        if (this.transactions.length == 4)
            return previous_block.index + 1
        else
            return previous_block.index
    }
    create_uid = () => {
        var dt = new Date().getTime();
        var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
    add_node = (id, password, res) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var db = client.db('Blockchain')
            var new_node = new node(id, password)
            var wallet = new_node.get_main_wallet()
            this.nodes.add(new_node._id)
            db.collection('users').findOne({ id: new_node.id }, (err, doc) => {
                if (doc)
                    res.send({ 'message': 'User already exists' })
                else {
                    db.collection('users').insertOne({ _id: new_node._id, 'id': new_node.id, 'password': new_node.password, 'wallets': new_node.wallets })
                    db.collection('wallets').insertOne({ _id: wallet._id, 'uid': wallet.uid, 'id': wallet.id, 'balance': wallet.balance, 'publicKey': wallet.publicKey }).then(() => {
                        res.status(200).send({ 'message': 'Node Added Successfully!' })
                        client.close()
                    })
                }
            })
        })
    }
    add_wallet = (uid, id) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var db = client.db('Blockchain')
            var identity = uid + '_' + id
            var walletsRSAkey = cryptico.generateRSAKey(identity, 1024)
            var publicKey = CryptoJS.SHA256(cryptico.publicKeyString(walletsRSAkey)).toString()
            db.collection('users').findOne({ _id: uid })
                .then((doc) => {
                    var wallet = {
                        '_id': publicKey.substring(0,32),
                        'uid': uid,
                        'id': id,
                        'balance': 0.00,
                        'publicKey': publicKey
                    }
                    doc.wallets.push(wallet)
                    this.wallets.push({ _id: wallet._id, 'bal': wallet.balance })
                    db.collection('wallets').insertOne({ _id: wallet._id, 'uid': wallet.uid, 'id': wallet.id, 'balance': wallet.balance, 'publicKey': wallet.publicKey }).then(() => { client.close() })
                })
        })
    }
    replace_chain = () => {
        var network = this.nodes
        var longest_chain = null
        var max_length = this.chain.length
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var db = client.db('Blockchain')
            db.collection('blocks').find({}).toArray((err, docs) => {
                if (err) return null
                docs.forEach((node) => {
                    var length = node.chain.length
                    if (length > max_length && this.is_chain_valid(node.chain)) {
                        max_length = length
                        longest_chain = node.chain
                    }
                })
                client.close()
            })
        })
        if (longest_chain != null) {
            this.chain = longest_chain
            return true
        }
        return false
    }
    get_wallets = () => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('wallets')
            col.find({}).toArray((err, docs) => {
                if (docs.length != 1)
                    docs.forEach((doc) => {
                        console.log(doc.balance)
                        this.wallets.push({ _id: doc._id, 'bal': Number(doc.balance) })
                        console.log(this.wallets)
                    })
            })
        })
    }
    get_pool = ()=>{
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('pool')
            col.find({}).toArray((err, docs) => {
                if (docs.length != 1)
                    docs.forEach((doc)=>{
                        Mempool.pool.push(doc)
                    })    
                client.close()
            })
        })
    }
    get_chain = () => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('chain')
            col.find({}).toArray((err, docs) => {
                if (docs.length != 1)
                    docs.forEach((doc)=>{
                        this.chain.push(doc)
                    })
                client.close()
            })
        })
    }
    remove_wallet = (walletid) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('wallets')
            this.wallets.forEach((wallet, i) => {
                if (wallet._id == walletid)
                    this.wallets.splice(i, 1)
            })
            col.deleteOne({ _id: walletid }).then(() => client.close())
        })
    }
    remove_user = (userid) => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('users')
            col.findOne({ _id: userid }).then((doc) => {
                for (i in [...Array(doc.wallets.length).keys()]) {
                    this.remove_wallet(doc.wallets[i]._id)
                }
                this.nodes.delete(userid)
                col.deleteOne({ _id: userid }).then(() => client.close())
            })
        })
    }
    isValid = (from, to, amount, fee) => {
        if (from == to)
            return false
        var i = 0
        var found = 0
        console.log(this.wallets.length)
        while (i < this.wallets.length) {
            if (this.wallets[i]._id == from && this.wallets[i].bal - amount - fee >= 0)
            {
                found += 1
                this.wallets[i].bal -= Number(amount)+ Number(fee)
            }
            i += 1
        }
        console.log(found)
        if (found == 1)
            return true
        //console.log(wallet.bal-amount-fee)
        return false
    }
    //Add in react
    sign_transaction = (from, to, amount, fee) => {
        var walletsRSAkey = cryptico.generateRSAKey(from, 1024)
        var walletspublickey = cryptico.publicKeyString(walletsRSAkey)
        var sign = cryptico.encrypt(this.from + this.to + this.amount.toString() + this.fee.toString(), walletspublickey)
        return CryptoJS.SHA256(sign).toString()
    }
    update_wallets = () => {
        MongoClient.connect(CONNECTION_URL, (err, client) => {
            if (err) throw err
            var col = client.db('Blockchain').collection('wallets')
            this.wallets.forEach((wallet) => {
                col.findOneAndUpdate({ _id: wallet._id }, { $set: { 'balance': wallet.bal } })
            })
        })
    }
}

const Blockchain = new blockchain()
const Mempool = new storage()
Blockchain.get_wallets()
Blockchain.get_pool()
Blockchain.get_chain()
//Account Creation
app.post('/signup', (req, res) => {
    console.log(req.body.email)
    Blockchain.add_node(req.body.email, req.body.password, res)
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
//Receive Dummy Ethers
//Initiating a transaction
app.post('/create_transaction', (req, res) => {
    req.body.transactions.forEach((transaction) => {
        var transaction = { from: transaction.from, to: transaction.to, amount: transaction.amount, fee: transaction.fee }
        if (Blockchain.isValid(transaction.from, transaction.to, transaction.amount, transaction.fee)) {
            console.log(transaction.amount)
            Mempool.add_transaction(transaction.from, transaction.to, transaction.amount, transaction.fee)
            res.send({ 'message': 'transactions initiated...' })
        }
        else
            res.send({ 'message': 'Insufficient Balance...' })
    })
})
//Transaction Validation
app.post('/transaction_valid', (req, res) => {
    console.log(req.body.transaction.from, req.body.transaction.to)
    var value = Blockchain.isValid(req.body.transaction.from, req.body.transaction.to, req.body.transaction.amount, req.body.transaction.fee)
    if (value)
        res.send({ 'status': true })
    else
        res.send({ 'status': false })
})
//Committing a transaction
//Account status as etherscan
//Block creation
app.post('/mine_block_manual', (req, res) => {
    //console.log(req.body)
    var previous_block = Blockchain.get_previous_block()
    previous_proof = previous_block.proof
    var proof = Blockchain.proof_of_work(previous_proof)
    //console.log(proof)
    var previous_hash = previous_block.hash
    //console.log(previous_hash)
    var Block = Blockchain.create_block(proof, previous_hash)
    Block.manual_transaction(req.body.transactions, req.body.add, Blockchain.wallets)
    console.log(req.body.transactions[0].amount)
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        var col = client.db('Blockchain').collection('blocks')
        col.insertOne({ _id: Blockchain.create_uid(), block: Block, confirmations: 0 }).then(() => {
            client.close()
        })
    })
})
app.post('/add_wallet', (req, res) => {
    Blockchain.add_wallet(req.body.uid, req.body.id)
    res.send({ 'message': 'Wallet Created' })
})
app.post('/mine_block_auto', (req, res) => {
    //console.log(req.body)
    var previous_block = Blockchain.get_previous_block()
    previous_proof = previous_block.proof
    var proof = Blockchain.proof_of_work(previous_proof)
    //console.log(proof)
    var previous_hash = previous_block.hash
    //console.log(previous_hash)
    var Block = Blockchain.create_block(proof, previous_hash)
    Block.add_transaction(req.body.add, Blockchain.wallets)
    //console.log(req.body.transactions[0].amount)
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        var col = client.db('Blockchain').collection('chain')
        col.findOne({ index: Block.index, previous_hash: Block.previous_hash }, (err, doc) => {
            if (doc) {
                Block.release_transaction(req.body.add)
                Blockchain.chain.pop()
                Blockchain.chain.push(doc)
                res.send({ 'message': 'transaction cancelled!' })
                client.close()
            }
            else {
                col.insertOne({ _id: Blockchain.create_uid(), index: Block.index, proof: Block.proof, timestamp: Block.timestamp, transactions: Block.transactions, previous_hash: Block.previous_hash, hash:Block.hash }).then(() => {
                    res.send({ 'message': 'block added successfully' })
                    Block.updateTrans()
                    client.close()
                })
            }
        })
    })
})
app.get('/get_wallets', (req, res) => {
    Blockchain.get_wallets()
    res.send('ThankYou')
})
//Checking block status
app.get('/get_chain', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        client.db('Blockchain').collection('chain').find({}).toArray((err, docs) => {
            res.send({ 'chain': docs })
            client.close()
        })
    })
})
app.post('/get_details', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        var wals = client.db('Blockchain').collection('wallets')
        console.log(req.body.uid)
        wals.find({ uid: req.body.uid }).toArray((err, docs) => {
            console.log(docs)
            client.close()
            res.send({ message: 'Success', wallets: docs})
        })
    })
})
app.post('/get_transactions', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        client.db('Blockchain').collection('blocks').find({$or:[{from:req.body.add},{to:req.body.add}]}).toArray((err, docs) => {
            res.send({ 'transactions': docs })
            client.close()
        })
    })
})
app.get('/pending_trans', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        client.db('Blockchain').collection('pool').find({}).toArray((err, docs) => {
            res.send({ 'pool': docs })
            client.close()
        })
    })
})
app.get('/all_transactions', (req, res) => {
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        client.db('Blockchain').collection('blocks').find({}).toArray((err, docs) => {
            res.send({ 'transactions': docs })
            client.close()
        })
    })
})

app.post('/get_more', (req, res) => {
    var reward
    var balance
    Blockchain.wallets.forEach((wallet)=>{
        if(wallet._id == req.body._id)
        {
            reward = Math.random()*10
            wallet.bal += reward
            balance = wallet.bal
            Blockchain.update_wallets()
        }    
    })
    console.log({'message':'Hurray!you received a reward of '+reward+' coins',balance:balance})
    res.send({message:('Hurray!you received a reward of '+reward+' coins'),balance:balance})
})

app.post('/get_block_details', (req, res)=>{
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        if (err) throw err
        client.db('Blockchain').collection('blocks').find({blockno: req.body.index}).toArray((err, docs) => {
            res.send({ 'transactions': docs })
            client.close()
        })
    })
})

app.post('/chose_wallet', (req, res)=>{
    MongoClient.connect(CONNECTION_URL, (err, client) => {
        client.db('Blockchain').collection('users').findOne({ id: req.body.id }).then((user)=>{
            if (!user) {
                res.send({'wallet_id': "USER DOES NOT EXIST"})
                client.close()
            }
            else{
                client.db('Blockchain').collection('wallets').findOne({uid: user._id}, (err, wallet)=>{
                    res.send({'wallet_id': wallet._id})
                    client.close()
                })
            }
        })


    })
})

// if(process.env.NODE_ENV == 'production')
// {
//     app.use(express.static("client/build"))
//     // const path = require("path")
//     // app.get('*',(req,res)=>{
//     //     res.sendFile(path.resolve(__dirname,'client','build','index.html'))
//     // })
// }



app.listen(PORT)