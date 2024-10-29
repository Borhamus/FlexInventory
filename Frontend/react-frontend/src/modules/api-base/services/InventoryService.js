import axios from 'axios';

// Este servicio centraliza el consumo de las apis relacionadas con Inventario.
export class InventoryService{
    baseUrl = "http://localhost:8080/inventory";
    
    // Método para obtener todos los inventarios.
    getAllInventories(){
        return axios.get(this.baseUrl + "/all").then(res => res.data);
    }

    // Método para obtener un inventario.
    getInventoryById(id){
        return axios.get(this.baseUrl + id).then(res => res.data);
    }
    
}

export default new InventoryService();