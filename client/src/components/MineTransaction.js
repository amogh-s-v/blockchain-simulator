import React, { useEffect, useState } from "react"
import Header from "./Header";

const PendingTransactions = () => {

    // const [user, setUser] = useState({
    //     transactions_: []
    // })

    
    const [transaction, setTransaction] = useState([])

    const [sTransaction, setsTransaction] = useState([])

    const [aTransaction, setaTransaction] = useState([])

    const [wallets, setWallets] = useState({
        wallets: []
    })

    const [signature, setSignature] = useState("")

    const [valid, setValid] = useState([])
    // const [state, setWallet] = useState({
    //     walletno: 0,
    //     walletname: undefined//JSON.parse(localStorage.getItem('MyUser'))[0]._id
    // })

    // const walletname = JSON.parse(localStorage.getItem('MyUser'))._id

    const [privilege, setPrivilige] = useState({
        status: 1
    })

    const userDetails = JSON.parse(localStorage.getItem('MyUser'));

    var transactions = [];

    // .filter(x => !sTransaction.includes(x));
    useEffect(()=>{
        console.log(Number(JSON.parse(localStorage.getItem("MyUser")).type))
        if(Number(JSON.parse(localStorage.getItem("MyUser")).type)!=3) 
        {
            alert("Not a miner")
            window.location.href="/"
        }
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
            // setUser({
            //     transactions_: transactions
            //     // transactions_: transactions.filter(x => !sTransaction.includes(x))
            // })
            setTransaction(transactions)
        });
    }, [])

    const [attr, setAttr] = useState({
        signature: "", 
        timestamp: ""
    })

     

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
                    'tList': sTransaction
                }),
                headers: { 'Content-Type': 'Application/json' }
            }).then(resp => resp.json()).then(resp => {setValid(resp.valid_or_not); })
            
        
    }

    const selectTransaction = (element) => {
        setsTransaction(
            sTransaction => [...sTransaction, element]
        )
    }

    const acceptTransaction = (element) => {
        setaTransaction(
            aTransaction => [...aTransaction, element]
        )
    }

    const signBlock = () => {
        fetch('/get_signature', {
            method: 'POST',
            body: JSON.stringify({
                private_key: userDetails.private_key,
                public_key: userDetails.public_key,
                // selectedTrans : aTransaction
            }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(resp => resp.json())
            .then(resp => {
                setAttr({
                    signature: resp.signature, 
                    timestamp: resp.timestamp
                })
            });
    }

    const createBlock = () => {
        fetch('/add_block', {
            method: 'POST',
            body: JSON.stringify({
                private_key: userDetails.private_key,
                public_key: userDetails.public_key,
                selectedTrans : aTransaction,
                signature: attr.signature, 
                timestamp: attr.timestamp,


            }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(resp => resp.json())
            .then(resp => {
                setAttr({
                    signature: resp.signature, 
                    timestamp: resp.timestamp
                })
                alert(resp.Message)
                window.location.href = '/validate'
            });
        
    }


    const removeTransaction = (element, remove) => {
        if(remove === 0){
            fetch('/invalidate_transaction', {
                method: 'POST',
                body: JSON.stringify({
                    id: element._id
                }),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(resp => resp.json())
                .then(resp => {alert(resp.Message)});
        }
        else{
            var temp = sTransaction.splice(sTransaction.indexOf(element), 1)
            setsTransaction(sTransaction.filter(x => !temp.includes(x)))
        }
        
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
                    {transaction.filter(x => !sTransaction.includes(x)).map((element, index) => (
                        <tr >
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
                                {/* <button type="button" class="btn btn-outline-success me-3" onClick={() => selectTransaction(element)}>Select</button> */}
                                <button type="button" class="btn btn-outline-success me-3" onClick={() => selectTransaction(element)}>Select</button>
                                {/* <button type="button" class="btn btn-outline-danger">✗</button> */}
                            </td>
                        </tr>
                    )
                    )
                    }

                </tbody>
            </table>

            <h3> Selected Transactions</h3>

            <button className="btn btn-primary" onClick={validateTrans} >
                Validate All The Selected Transactions
            </button>
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
                    {sTransaction.filter(x => !aTransaction.includes(x)).map((element, index) => (
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
                            <button type="button" class="btn btn-outline-success me-3" onClick={() => {acceptTransaction(element); var arr = valid; arr.splice(index, 1); setValid(arr)}}>✓</button>
                                {/* <button type="button" class="btn btn-outline-success me-3" onClick={() => {acceptTransaction(element); setValid(valid.filter(x => !valid.splice(index, 1).includes(x)))}}>✓</button> */}
                            <button type="button" class="btn btn-outline-danger" onClick={() => {removeTransaction(element, valid[index]); var arr = valid; arr.splice(index, 1); setValid(arr)}}>✗</button>
                            </td>
                        </tr>
                    )
                    )
                    }

                </tbody>
            </table>

            <h3> Accepted Transactions </h3>
            <p> These Transactions will go into the Block.</p>
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
                    {aTransaction.map((element, index) => (
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
                <p><span style = {{fontWeight: 'bold'}}>&nbsp;Public Key: </span>{userDetails.public_key}</p>
                <p><span style = {{fontWeight: 'bold'}}>&nbsp;Signature: </span><button type="button" class="btn btn-success" onClick={signBlock}>Sign</button>&nbsp;&nbsp;{attr.signature}</p>
            </div>

            <button type="button" class="btn btn-danger" onClick = {createBlock}>Create Block</button>


        </div>

        
    )
}

export default PendingTransactions;