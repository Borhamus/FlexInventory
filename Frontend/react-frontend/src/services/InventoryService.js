import axios from "./AxiosConfig";

// Este servicio centraliza el consumo de las apis relacionadas con Inventario.
export class InventoryService {
    baseUrl = "http://localhost:8081/inventory/";

    // Método para obtener todos los inventarios.
    getAllInventories() {
        return axios.get(this.baseUrl + "all").then(res => res.data);
    }

    // Método para obtener un inventario.
    getInventoryById(id) {
        return axios.get(this.baseUrl + id).then(res => res.data);
    }

    // Método para borrar un inventario.
    deleteInventoryById(id) {
        return axios.delete(this.baseUrl + id);
    }

    // Método para crear un nuevo inventario.
    createInventory(inventoryData) {
        return axios
            .post(this.baseUrl + "create", inventoryData)
            .then((res) => res.data) // Devuelve la respuesta del servidor (puedes usarla si necesitas)
            .catch((error) => {
                console.error("Error al crear inventario:", error);
                throw error; // Lanza el error para que se pueda manejar en el componente
            });
    }
}

export default new InventoryService();
