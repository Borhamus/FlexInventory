import { Component } from 'react';
import './App.css';
import { InventoryService } from './service/InventoryService';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import {Panel} from "primereact/panel";

import "primereact/resources/themes/nova/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"


export default class App extends Component{
  constructor(){
    super();
    this.state = {};
    this.inventoryService = new InventoryService();
  }

  componentDidMount(){
    this.inventoryService.getAll().then(data => this.setState({inventories: data}))
  }
  
  render(){
    return (
      <Panel header = "Inventarios" style = {{width:"60%", margin: "0 auto", marginTop: "20px"}}>
        <DataTable value={this.state.inventories}>
        <Column field="id" header = "ID"></Column>
        <Column field="name" header = "NAME"></Column>
        <Column field="description" header = "DESCRIPTION"></Column>
        <Column field="user" header = "USER"></Column>
        <Column field="creation_date" header = "CREATION DATE"></Column>
        <Column field="revision_date" header = "REVISION DATE"></Column>
      </DataTable>
      </Panel>
    );
  }
}