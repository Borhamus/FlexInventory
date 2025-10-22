import axios from "./AxiosConfig";

export class AttributeService {
    baseUrl = "http://localhost:8081/attribute/";

    // Método para obtener todos los atributos.
    getAllAttributes() {
        return axios.get(this.baseUrl + "all").then(res => res.data);
    }

    // Método para crear un nuevo inventario.
    createAttribute(attributeData) {
        return axios
            .post(this.baseUrl + "create/", attributeData)
            .catch((error) => {
                console.error("Error al crear el Atributo:", error);
                throw error; // Lanza el error para que se pueda manejar en el componente
            });
    }
}

export default new AttributeService();