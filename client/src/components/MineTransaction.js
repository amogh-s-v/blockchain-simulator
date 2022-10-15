import React, { useEffect, useState } from "react"
import Header from "./Header";

const PendingTransactions = () => {

    const [user, setUser] = useState({
        transactions_: []
    })

    const [sTransaction, setsTransaction] = useState([])

    const [wallets, setWallets] = useState({
        wallets: []
    })

    const [signature, setSignature] = useState("")

    const [valid, setValid] = useState([])
    // const [state, setWallet] = useState({
    //     walletno: 0,
    //     walletname: undefined//JSON.parse(localStorage.getItem('MyUser'))[0]._id
    // })

    const walletname = JSON.parse(localStorage.getItem('MyUser'))._id

    const [privilege, setPrivilige] = useState({
        status: 1
    })

    const userDetails = JSON.parse(localStorage.getItem('MyUser'));

    var transactions = [];

    // .filter(x => !sTransaction.includes(x));
    useEffect(()=>{
        fetch('/get_pool',{
            method: 'POST',
            body: JSON.stringify({
                'key': "ignore"
            }),
            headers: { 'Content-Type': 'Application/json' }
        })
        .then(resp => resp.json())
        .then(resp => {
            transactions = resp.Pool;
            setUser({
                transactions_: transactions
                // transactions_: transactions.filter(x => !sTransaction.includes(x))
            })
        });
    }, [])

    console.log(user.transactions_)
     

    // fetch('/privilige_status')
    //     .then(resp => resp.json())
    //     .then(resp => {
    //         status_ = resp.status;
    //         setUser({
    //             status : status_
    //         })
    //     });

    // const handleChangeWallet = e => {
    //     //const { name, value } = e.target
    //     setWallet({
    //         walletno: Number(e.target.name),
    //         walletname: JSON.parse(localStorage.getItem('MyUser'))[Number(e.target.name)]._id
    //     })
    // }

    // const getDetails = () => {
    //     var transactions = [];
    //     console.log(JSON.parse(localStorage.getItem("MyUser"))[0].uid)
    //     fetch('/get_details', {
    //         method: 'POST',
    //         body: JSON.stringify({
    //             uid: JSON.parse(localStorage.getItem("MyUser"))[0].uid
    //         }),
    //         headers: { 'Content-Type': 'application/json' }
    //     })
    //         .then(resp => resp.json())
    //         .then(resp => {
    //             transactions = resp.wallets;
    //             setWallets({
    //                 wallets: transactions
    //             })
    //             localStorage.setItem("MyUser", JSON.stringify(resp.wallets))
    //         });
    //     //window.location.href = '/details';
    // }

    const validateTrans = () => {
        
            var arr
            var fetch = require('cross-fetch')
            fetch('/validateTrans', {
                method: 'POST',
                body: JSON.stringify({
                    'tList': user.transactions_
                }),
                headers: { 'Content-Type': 'Application/json' }
            }).then(resp => resp.json()).then(resp => setValid(resp.valid_or_not))
        
    }

    const selectTransaction = (element) => {
        setsTransaction(
            sTransaction => [...sTransaction, element]
        )
    }

    const signBlock = () => {
        fetch('/get_signature', {
            method: 'POST',
            body: JSON.stringify({
                publicKey: userDetails.publicKey,
                selectedTrans : sTransaction,
            }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(resp => resp.json())
            .then(resp => {
                alert(resp.message)
            });
    }

    const getColor = (status) => {
        if (status === 0) return '#FFCCCB'; //red
        if (status === 1) return '#90EE90'; //blue
        return '';
      };

    return (
        <div>
            <div className="container">
                <h1>Mine Transactions</h1>
                <p>These transactions are waiting to be included in the next block. Next block is created when you start the mining process.</p>
            </div>
            

            <h3> Pending Transactions</h3>
            <button className="btn btn-primary" onClick={validateTrans} >
                Validate All The Pending Transactions
            </button>
            <table className="table table-hover table-striped">
                <tbody>
                    <tr>
                        <th>#</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                        <th>Fee</th>
                        <th>Accept/Reject</th>
                    </tr>
                    {user.transactions_.filter(x => !sTransaction.includes(x)).map((element, index) => (
                        <tr style={{ background: getColor(valid[index])}}>
                            <td>
                                {index + 1}
                            </td>
                            <td>
                                {element.from.substring(0, 32)}...
                            </td>
                            <td>
                                {element.to.substring(0, 32)}...
                            </td>
                            <td>
                                {element.amount}
                            </td>
                            <td>
                                {element.fee}
                            </td>
                            <td>
                                {/* <button type="button" class="btn btn-outline-success me-3" onClick={selectTransaction(element)}>✓</button> */}
                                <button type="button" class="btn btn-outline-success me-3" onClick={() => selectTransaction(element)}>✓</button>
                                <button type="button" class="btn btn-outline-danger">✗</button>
                            </td>
                        </tr>
                    )
                    )
                    }

                </tbody>
            </table>

            <h3> Selected Transactions</h3>
            <table className="table table-hover table-striped">
                <tbody>
                    <tr>
                        <th>#</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                        <th>Fee</th>
                        <th>Accepted</th>
                    </tr>
                    {sTransaction.map((element, index) => (
                        <tr>
                            <td>
                                {index + 1}
                            </td>
                            <td>
                                {element.from.substring(0, 32)}...
                            </td>
                            <td>
                                {element.to.substring(0, 32)}...
                            </td>
                            <td>
                                {element.amount}
                            </td>
                            <td>
                                {element.fee}
                            </td>
                            <td>
                                ✓
                            </td>
                        </tr>
                    )
                    )
                    }

                </tbody>
            </table>
            {/* <div className="dropdown">
                <p>Wallet Chosen: 
                    {
                    state.walletname ? <p>{state.walletname}</p>: <p>None</p>}
                </p>
                <button className="btn btn-primary" onClick={getDetails}>Choose Wallet</button>
                <div className="dropdown-content">
                    {wallets.wallets.map((element, index) => (
                        <a onClick={handleChangeWallet} name={index}>{element.id}</a>
                    ))}
                </div>
            </div> */}
            
            {
            privilege.status==1 ? 
            <>
            
            &nbsp;&nbsp;
            {/* <button className="btn btn-primary" onClick={minePendingTransactions} >
                Add Block
            </button> */}
            </>
            :
            privilege.status==2 ?
            <button className="btn btn-primary" >
                Validate Block
            </button>
            :
            <p> <h4>You're Not A Validator! </h4> </p>
            }

            <h1>&nbsp;&nbsp;Miner's Details</h1>
            <div style={{ 'margin': '24px', 'border': '2px solid black'}}>
                <p><span style = {{fontWeight: 'bold'}}>&nbsp;Block Index Name: </span></p>
                <p><span style = {{fontWeight: 'bold'}}>&nbsp;Public Key: </span>{userDetails.publicKey}</p>
                <p><span style = {{fontWeight: 'bold'}}>&nbsp;Signature: </span><button type="button" class="btn btn-success" onClick={signBlock}>Sign and Create Block</button></p>
            </div>


        </div>

        
    )
}

export default PendingTransactions;