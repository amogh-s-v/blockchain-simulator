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

    const [state, setWallet] = useState({
        walletno: 0,
        walletname: undefined//JSON.parse(localStorage.getItem('MyUser'))[0]._id
    })

    const [privilege, setPrivilige] = useState({
        status: 1
    })

    var transactions = [];
    fetch('/pending_trans')
        .then(resp => resp.json())
        .then(resp => {
            transactions = resp.pool.filter(x => !sTransaction.includes(x));
            setUser({
                transactions_: transactions
                // transactions_: transactions.filter(x => !sTransaction.includes(x))
            })
        });

    // fetch('/privilige_status')
    //     .then(resp => resp.json())
    //     .then(resp => {
    //         status_ = resp.status;
    //         setUser({
    //             status : status_
    //         })
    //     });

    const handleChangeWallet = e => {
        //const { name, value } = e.target
        setWallet({
            walletno: Number(e.target.name),
            walletname: JSON.parse(localStorage.getItem('MyUser'))[Number(e.target.name)]._id
        })
    }

    const getDetails = () => {
        var transactions = [];
        console.log(JSON.parse(localStorage.getItem("MyUser"))[0].uid)
        fetch('/get_details', {
            method: 'POST',
            body: JSON.stringify({
                uid: JSON.parse(localStorage.getItem("MyUser"))[0].uid
            }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(resp => resp.json())
            .then(resp => {
                transactions = resp.wallets;
                setWallets({
                    wallets: transactions
                })
                localStorage.setItem("MyUser", JSON.stringify(resp.wallets))
            });
        //window.location.href = '/details';
    }

    const minePendingTransactions = () => {
        if (state.walletname) {
            var fetch = require('cross-fetch')
            fetch('/mine_block_auto', {
                method: 'POST',
                body: JSON.stringify({
                    add: state.walletname
                }),
                headers: { 'Content-Type': 'Application/json' }
            }).then(resp => resp.json()).then(resp => alert(resp.message))
        }
        else
            alert('Please choose a wallet first...')
    }

    const selectTransaction = (element) => {
        setsTransaction(
            sTransaction => [...sTransaction, element]
        )
    }

    return (
        <div>
            <div className="container">
                <h1>Mine Transactions</h1>
                <p>These transactions are waiting to be included in the next block. Next block is created when you start the mining process.</p>
            </div>

            <h3> Pending Transactions</h3>
            <button className="btn btn-primary" onClick={minePendingTransactions} >
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
                    {user.transactions_.map((element, index) => (
                        <tr>
                            <td>
                                {index + 1}
                            </td>
                            <td>
                                {element.from}
                            </td>
                            <td>
                                {element.to}
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
                                {element.from}
                            </td>
                            <td>
                                {element.to}
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
            <div className="dropdown">
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
            </div>
            &nbsp;&nbsp;
            <button className="btn btn-primary" onClick={minePendingTransactions} >
                Add Block
            </button>
            </>
            :
            privilege.status==2 ?
            <button className="btn btn-primary" onClick={minePendingTransactions} >
                Validate Block
            </button>
            :
            <p> <h4>You're Not A Validator! </h4> </p>
            }
        </div>
    )
}

export default PendingTransactions;