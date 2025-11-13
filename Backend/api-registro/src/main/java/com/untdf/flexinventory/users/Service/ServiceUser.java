package com.untdf.flexinventory.users.Service;

import com.untdf.flexinventory.users.Access.AccessUser;
import com.untdf.flexinventory.users.Model.User;
import com.untdf.flexinventory.users.Transferable.TransferableGetUser;
import com.untdf.flexinventory.users.Transferable.TransferableUser;
import com.untdf.flexinventory.users.Transformer.TransformerUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class ServiceUser {

    @Autowired
    AccessUser accessUser;

    @Autowired
    TransformerUser transformer;

    public TransferableUser getUserById(Integer id){

        Optional<User> user = accessUser.findById(id);

        if(user.isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "User with id: " + id + " was not found."
            );
        }

        return transformer.toDTO(user.get());
    }

    public TransferableUser editUser(TransferableUser transferable){
        Optional<User> user = accessUser.findById(transferable.getId());

        if(user.isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "User with id: " + transferable.getId() + " was not found."
            );
        }

        User userUpdated = user.get();

        userUpdated.setName(transferable.getName());
        userUpdated.setPassword(transferable.getPassword());

        accessUser.save(userUpdated);

        return transformer.toDTO(userUpdated);
    }

    public void deleteUserById(Integer id){
        if(accessUser.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "User with id: " + id + " was not found."
            );
        }

        accessUser.deleteById(id);
    }

    public TransferableUser createUser(TransferableUser transferable){
        User createdUser = accessUser.save(transformer.toEntity(transferable));
        return transformer.toDTO(createdUser);
    }

    public List<TransferableGetUser> getAllUser(){

        List<User>allUsers = accessUser.findAll();


        if(allUsers.isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NO_CONTENT, "There is no Users."
            );
        }

        return transformer.toDTOGetAllUser(allUsers);
    }
}
