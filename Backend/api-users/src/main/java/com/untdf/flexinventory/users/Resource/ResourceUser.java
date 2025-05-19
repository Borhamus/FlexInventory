package com.untdf.flexinventory.users.Resource;

import com.untdf.flexinventory.users.Service.ServiceUser;
import com.untdf.flexinventory.users.Transferable.TransferableUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@CrossOrigin("*")
@Tag(name = "User Endpoint.", description = "Operations related to Users - CRUD")
public class ResourceUser {

    @Autowired
    ServiceUser service;

    @GetMapping(value = "/{id}")
    public ResponseEntity<TransferableUser> getUser(@PathVariable("id") Integer id){
        //logger.info("Trying to get the user with id =" + id);
        TransferableUser user = service.getUserById(id);

        return ResponseEntity.ok(user);
    }

}
