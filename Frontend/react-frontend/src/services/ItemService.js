import axios from "./AxiosConfig";

// Este servicio centraliza el consumo de las apis relacionadas con Inventario.
export class ItemService {
    baseUrl = "http://localhost:8081/item/";

    // Método para borrar un inventario.
    deleteItemById(id) {
        return axios.delete(this.baseUrl + id);
    }

    createItem(payload) {
        return axios.post(this.baseUrl + "create/", payload);
    }

}

export default new ItemService();
