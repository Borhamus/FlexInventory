package com.untdf.flexinventory.base.Resource;


import com.untdf.flexinventory.base.Transferable.TransferableCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import com.untdf.flexinventory.base.Service.ServiceCatalog;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController  //para manejar las cosas como tipo json
@RequestMapping("/catalog") //para la url
@CrossOrigin("*")  //indica desde que host se puede acceder a la api
public class ResourceCatalog {

    @Autowired
    ServiceCatalog service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableCatalog>>getAllCatalog(){
        return ResponseEntity.ok(service.getAllCatalog());
    }

}
