import axios from "./AxiosConfig";

// Este servicio centraliza el consumo de las apis relacionadas con Inventario.
export class CatalogService {
    baseUrl = "http://localhost:8081/catalog/";

    // Método para obtener todos los inventarios.
    getAllCatalogs() {
        return axios.get(this.baseUrl + "all").then(res => res.data);
    }

    // Método para obtener un inventario.
    getCatalogById(id) {
        return axios.get(this.baseUrl + id).then(res => res.data);
    }

    // Método para borrar un inventario.
    deleteCatalogById(id) {
        return axios.delete(this.baseUrl + id);
    }

}

export default new CatalogService();