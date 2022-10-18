import React, { useEffect, useState } from "react";
import axios from 'axios';
import BlockView from './BlockView'
import './BlockView.css'

import { Container } from "react-bootstrap";

const ValidateTransaction = () => {

    
    const [valid, setValid] = useState([])
    const [chain, setChain] = useState([])
    const [click, setClick] = useState({
        click_: 0,
        hash: '',
        index: 0, 
        transactions:[], 
        blockid: 0,
    })

    useEffect(() => {
      if(Number(JSON.parse(localStorage.getItem("MyUser")).type)==1) 
      {
          alert("Not a miner/validator")
          window.location.href="/"
      }
      const fetchData = async () => {
        const result = await getItems();
        console.log(result.Blocks);
        setChain(result.Blocks);
      }
      fetchData()
    }, [])

    const getItems = async () => {
      try {
        const { data } = await axios.post('/get_pending_blocks', {
          'validator_key': JSON.parse(localStorage.getItem('MyUser')).public_key
        })
        return data
      } catch (error) {
        console.log(error)
      }

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

    const validateTrans = () => {
        
      var arr
      var fetch = require('cross-fetch')

      fetch('/validateTrans', {
          method: 'POST',
          body: JSON.stringify({
              'tList': click.transactions
          }),
          headers: { 'Content-Type': 'Application/json' }
      }).then(resp => resp.json()).then(resp => {setValid(resp.valid_or_not); })
      
  
}

    const vote = (status) => {
      fetch('/votes', {
        method: 'POST',
        body: JSON.stringify({
            '_id': click.blockid, 
            'public_key': JSON.parse(localStorage.getItem("MyUser")).public_key,
            'vote': status
        }),
        headers: { 'Content-Type': 'Application/json' }
    })
    .then(resp => resp.json())
    .then(resp => {setValid(resp.valid_or_not); alert(resp.Message) })
    }

    const getColor = (status) => {
      if (status === 0) return '#FFCCCB'; //red
      if (status === 1) return '#90EE90'; //blue
      return '';
    };


    return(
        <div>
            <div className="container1" style={{ 'marginLeft': '55px' }}>
                <h1>Blocks To Be Validated</h1>
            </div>
        <br/>
        <div className="container2" style={{ 'marginLeft': '55px' }}>
            {
              chain.map((element, index) => (
                <BlockView
                  setClick={setClick}
                  block={element}
                  key={index}
                  index={index + 1}
                />
              ))
            }
        </div>
        <br></br>
        <>
            {click.click_ ?
              <Container>
                <div>
                  <h6>Block Hash:  {click.hash} </h6>
                </div>
                <table className="table table-hover table-striped">
                  <tbody>
                    <tr>
                      <th>#</th>
                      <th>Block Number</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount</th>
                      <th>Fee</th>
                    </tr>
                    {click.transactions.map((element, index) => (
                      <tr style={{ background: getColor(valid[index]) }}>
                        <td>
                          {index + 1}
                        </td>
                        <td>
                          {element.blockno}
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
                      </tr>
                      
                    )
                    )
                    
                    }

                  </tbody>
                </table>
                <button type="button" class="btn btn-success " onClick={()=>{validateTrans()}}>Validate Transactions</button>
                <br></br>
                <br></br>
                <button type="button" class="btn btn-success me-3" onClick={()=>{vote(1)}}>Vote For Block {click.index} To Be Accepted </button>
                <button type="button" class="btn btn-danger" onClick={()=>{vote(0)}}>Vote For Block {click.index} To Be Rejected </button>
                <br></br>
                <br></br>
              </Container>
              :
              <></>
            }
        </>
        </div>
    )
}



export default ValidateTransaction;