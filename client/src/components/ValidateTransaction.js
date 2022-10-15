import React, { useEffect, useState } from "react";
import axios from 'axios';
import BlockView from './BlockView'
import './BlockView.css'

import { Container } from "react-bootstrap";

const ValidateTransaction = () => {
    const [chain, setChain] = useState([])
    const [click, setClick] = useState({
        click_: 0,
        hash: '',
        index: 0, 
        transactions:[]
    })

  // fetch('/get_chain')
  //   .then(resp => resp.json())
  //   .then(resp => {
  //     setChain(resp.chain)
  //   })

    useEffect(() => {
        const fetchData = async () => {
          const result = await getItems();
          setChain(result.chain);
        }
        fetchData()
    }, [])

    const getItems = async () => {
        var data
        // try {
        //   const { data } = await axios.get('/get_pending_blocks')
        //   return data
        // } catch (error) {
        //   console.log(error)
        // }
        fetch('/get_pending_blocks', {
          method: 'POST',
          body: JSON.stringify({
              'validator_key': JSON.parse(localStorage.getItem('MyUser'))._id, 
          }),
          headers: { 'Content-Type': 'Application/json' }
      })
      .then(resp => {
        resp = resp.json()
        data = resp.blocks
      })
    }

    const validateTransactions = () => {

    }

    const vote = (staus) => {
        
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
                      <tr style={{ background: getColor(0), color: "white" }}>
                        <td>
                          {index + 1}
                        </td>
                        <td>
                          {element.blockno}
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
                      </tr>
                      
                    )
                    )
                    
                    }

                  </tbody>
                </table>
                <button type="button" class="btn btn-success " onClick={validateTransactions}>Validate Transactions</button>
                <br></br>
                <br></br>
                <button type="button" class="btn btn-success me-3" onClick={vote(1)}>Vote For Block {click.index} To Be Accepted </button>
                <button type="button" class="btn btn-danger" onClick={vote(0)}>Vote For Block {click.index} To Be Rejected </button>
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