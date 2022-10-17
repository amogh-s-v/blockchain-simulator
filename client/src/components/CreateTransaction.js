import { render } from 'react-dom';
import React, { useState, useEffect } from "react";
import '../../src/App.css';
import axios from 'axios';
import Header from './Header'

const CreateTransaction = () => {

    // const [wallets, setWallets] = useState([])

    // const [state, setWallet] = useState({
    //     walletno:0,
    //     walletname:JSON.parse(localStorage.getItem('MyUser'))._id
    // })

    const  walletname = JSON.parse(localStorage.getItem('MyUser')).public_key
    

    const [user, setUser] = useState({
        signature: "",
        toUser: "",
        toAddress:"",
        amount: "",
        fee: "", 
        timestamp: "", 
    })

    const index = 0
    const myUser = JSON.parse(localStorage.getItem('MyUser'))
    // const walletname = string[state.walletno]._id

    const handleChange = e => {
        const { name, value } = e.target
        setUser({
            ...user,
            [name]:value
        })
    }
    console.log(user)

    // const handleChangeWallet = e => {
    //     //const { name, value } = e.target
    //     setWallet({
    //         walletno:Number(e.target.name),
    //         walletname:JSON.parse(localStorage.getItem('MyUser'))._id
    //     })
    // }

    // useEffect(() => {
    //     const fetchData = async () => {
    //       var transactions = [];
    //       const resp = await getDetails();
    //       console.log(resp);
    //       transactions = resp.wallets;
    //       setWallets(transactions);
    //       localStorage.setItem("MyUser",JSON.stringify(resp.wallets))
    //     }
    //     fetchData()
    //   }, [])
    
      const getDetails = async () => {
        try {
          console.log(JSON.parse(localStorage.getItem("MyUser")).private_key)
          const { data } = await axios.post('/get_details', {uid: JSON.parse(localStorage.getItem("MyUser")).private_key})
          console.log(data)
          return data
        } catch (error) {
          console.log(error)
        }
      }

    const getUserWallet = () => {
        fetch('/chose_wallet', {
            method: 'POST',
            body: JSON.stringify({
                id: user.toUser
                }),
            headers: { 'Content-Type': 'Application/json' }
        })
        .then(resp => resp.json())
        .then(resp => 
            {
                setUser({
                    signature: user.signature,
                    toUser: user.toUser,
                    toAddress:user.toAddress,
                    amount: user.amount,
                    fee: user.fee, 
                    timestamp: user.timestamp,
                    toAddress: resp.public_key, 
                })
                if(resp.Message !== "") {alert(resp.Message)}
            })
    }

    const getSignature = () => {
        console.log("Beofre fetch", user)
        fetch('/get_signature_transaction', {
            method: 'POST', 
            body: JSON.stringify({
                'private_key': myUser.private_key,
                'public_key': myUser.public_key,
                'to': user.toAddress,
                'amount': user.amount,
            }),
            headers:{ 'Content-Type': 'Application/json' }
        })
        .then (resp => resp.json())
        .then (resp =>{
            console.log("before", user)
            setUser({
                signature: resp.signature,
                toUser: user.toUser,
                toAddress:user.toAddress,
                amount: user.amount,
                fee: user.fee, 
                timestamp: resp.timestamp,
            })
            console.log("after", user)
            alert(resp.Message);
            // var x = localStorage.getItem("MyUser");
            // x.signature = resp.signature;
            // x.timestamp = resp.timestamp;
            // localStorage.setItem(x);
        })
    }

    const createTransaction = () => {
        var fetch = require('cross-fetch')
        fetch('/create_transaction', {
            method: 'POST',
            body: JSON.stringify({
                'key': myUser.private_key,
                'from': myUser.public_key,
                'to': user.toAddress,
                'amount': user.amount,
                'signature': user.signature, 
                'timestamp': user.timestamp
            }),
            headers: { 'Content-Type': 'Application/json' }
        }).then(resp => resp.json()).then(resp => { alert(resp.Message) })
    }


    return (
        <div>
            <div className="container">
                <h1>Create transaction</h1>
                <p>Transfer some money to someone!</p>
                <br />
                <div className="form-group">
                    <p>From address</p>
                    <input type="text" className="form-control" id="fromAddress" aria-describedby="fromAddressHelp" disabled value={walletname} />
                    <small id="fromAddressHelp" className="form-text text-muted">
                        This is your wallet address. You cannot change it because you can only spend your own coins.
                    </small>
                </div>
                <br/><br/>
                <div className="form-group">
                    <p>To address</p>
                    <input type="text" className="form-control" id="toUser" aria-describedby="toAddressHelp" onChange={handleChange} name='toUser' value={user.toUser} />
                    <button onClick={getUserWallet} type="submit" className="btn btn-primary">Get user's waller address</button>
                    <input type="text" className="form-control" id="toAddress" aria-describedby="toAddressHelp" onChange={handleChange} name='toAddress' value={user.toAddress} />
                    <small id="toAddressHelp" className="form-text text-muted">
                        The address of the wallet where you want to send the money to. You can type random text here (if you are not interested in recovering the funds)
                    </small>
                </div><br/><br/>
                <div className="form-group">
                    <p>Amount</p>
                    <input type="number" className="form-control" id="amount" aria-describedby="amountHelp" onChange={handleChange} name='amount' value={user.amount} />
                    <small id="amountHelp" className="form-text text-muted">
                        You can transfer any amount.
                    </small>
                </div><br/><br/>

                <div className="form-group">
                    <p>Signature</p>
                    <button onClick={getSignature} type="submit" class="btn btn-danger">Sign</button>
                    <input type="text" className="form-control" id="signature" aria-describedby="signature" onChange={handleChange} name='signature' value={user.signature} />
                </div>
                <button onClick={createTransaction} type="submit" class="btn btn-success">Initiate Transaction</button>
                <br></br>
                <br></br>
                <br></br>
                {/* <label value = {sign_transaction()}/> */}
            </div>
        </div>
    )
}

export default CreateTransaction;