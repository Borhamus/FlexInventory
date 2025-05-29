import axios from "./AxiosConfig";

export class AttributeService {
    baseUrl = "http://localhost:8081/attribute/";

    // Método para obtener todos los atributos.
    getAllAttributes() {
        return axios.get(this.baseUrl + "all").then(res => res.data);
    }
}

export default new AttributeService();