import axios from "./AxiosConfig";

export class UserService {
    baseUrl = "http://localhost:8080/users/";

    getAllUser() {
        return axios.get(this.baseUrl + "all").then(res => res.data);
    }
}

export default new UserService();