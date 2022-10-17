import React, { useState, useEffect } from 'react'
import LSForm from './LSForm';
import './Sidebar.css'

const SidebarData = () => {

  const [cw, setCw] = useState({
    cw: false
  })
  const handleNewWallet = () => {
    const string = localStorage.getItem('MyUser').toString()
    const uid_ = JSON.parse(string.replace('}{', '},{'))[0].uid
    fetch(
      '/add_wallet', {
      method: 'POST',
      body: JSON.stringify({
        uid: uid_,
        id: nameRef.value
      }),
      headers: {
        'Content-Type': 'Application/json'
      }
    }
    ).then(resp => resp.json())
      .then(resp => {
        alert(resp.message)
        setCw(false)
      })
  }

  var nameRef

  const [wallets, setWallets] = useState({
    wallets: []
  })
  const move = (element) => {
    //const { name, value } = e.target
    window.location.href = '/details/' + element.target.name
  }

  const getDetails = () => {
    var transactions = [];
    console.log(JSON.parse(localStorage.getItem("MyUser")).public_key)
    fetch('/get_details', {
      method: 'POST',
      body: JSON.stringify({
        public_key: JSON.parse(localStorage.getItem("MyUser")).public_key
      }),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(resp => resp.json())
      .then(resp => {
            var x = JSON.parse(localStorage.getItem("MyUser"))
            x.balance = resp.balance
            x.stake = resp.stake
            x.type = resp.type
            localStorage.setItem("MyUser",JSON.stringify(x))
      });
  }
  function MouseOver(event) {
    getDetails();
    window.location.href = '/details/'
  }

  return (
    <div>
      <br></br>
      <br></br>
      <br />

      <button
        type="button"
        className='btn btn-outline-light'
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/"
        }}>
        View Blocks on The Chain
      </button>

      <br></br>
      <br></br>


      <button
        type="button"
        className='btn btn-outline-light'
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/new/transaction"
        }}>
        New transaction
      </button>

      <br></br>
      <br></br>

      <button
        type="button"
        className="btn btn-outline-light"
        onClick={MouseOver} >
        Wallets 
      </button>

      <br /><br />
      <button
        type="button"
        className="btn btn-outline-light"
        onClick={(e) => {
          // e.preventDefault();
          fetch('/get_details', {
            method: 'POST',
            body: JSON.stringify({ public_key: JSON.parse(localStorage.getItem("MyUser")).public_key }),
            headers: { 'Content-Type': 'Application/json' }
        })
        .then(resp => resp.json())
        .then(resp => {
            alert(resp.Message)
            var x = JSON.parse(localStorage.getItem("MyUser"))
            x.balance = resp.balance
            x.stake = resp.stake
            x.type = resp.type
            localStorage.setItem("MyUser",JSON.stringify(x))
        })
          window.location.href = "/mineblock"
        }}>
        Mine Block
      </button>
      {/* <div className="dropdown">
        <button className='btn btn-outline-light' onMouseOver={MouseOver} >Wallets</button>
        <div className="dropdown-content">
          {wallets.wallets.map((element, index) => (
            <a onClick={(element) => { move(element) }} name={index}>{element.id}</a>
          ))}
          <a onClick={() => { setCw(true) }}>+ Create Walltet</a>
        </div>
      </div>

      {
        (cw == true) &&

        <div>
          <br></br>
          <br></br>
          <p>Enter name of new wallet</p>
          <input type='text' name='new_wallet_name' ref={(el) => nameRef = el}></input>
          <button
            type="button"
            className='btn btn-outline-light'
            onClick={handleNewWallet}>
            Create Wallet
          </button>
        </div>
      }
       */}
      <br></br>
      <br></br>
      <button
        type="button"
        className='btn btn-outline-light'
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/validate"
          
        }}>
        Validate Transactions
      </button>
      <br></br>
      <br></br>
      <button
        type="button"
        className='btn btn-outline-light'
        onClick={(e) => {
          window.location.href = "/history"
        }}>
        Transaction History
      </button>
      <br></br>
      <br></br>
      <button
        type="button"
        className='btn btn-outline-light'
        onClick={(e) => {
          localStorage.removeItem('MyUser');
          localStorage.removeItem('UserName');
          e.preventDefault();
          window.location.href = "/"
        }}>
        Logout
      </button>
    </div>
  );
}

export default SidebarData