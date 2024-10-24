import axios from 'axios';

export class InventoryService{
    baseUrl = "http://localhost:8080/inventories";
    getAll(){
        return axios.get(this.baseUrl + "/all").then(res => res.data);
    }
}