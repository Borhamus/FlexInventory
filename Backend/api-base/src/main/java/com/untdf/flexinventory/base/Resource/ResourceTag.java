package com.untdf.flexinventory.base.Resource;


import com.untdf.flexinventory.base.Service.ServiceInventory;
import com.untdf.flexinventory.base.Transferable.TransferableTag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import com.untdf.flexinventory.base.Service.ServiceTag;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController  //para manejar las cosas como tipo json
@RequestMapping("/tag") //para la url
@CrossOrigin("*")  //indica desde que host se puede acceder a la api
public class ResourceTag {

    @Autowired
    ServiceTag service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableTag>>getAllTags(){
        return ResponseEntity.ok(service.getAllTags());
    }

}
