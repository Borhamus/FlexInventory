package com.untdf.flexinventory.base.Resource;

import com.untdf.flexinventory.base.Service.ServiceInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/inventories")
@CrossOrigin("*")
public class ResourceInventory {

    @Autowired
    ServiceInventory service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableInventory>> getAllInventories(){
        return ResponseEntity.ok(service.getAllInventories());
    }
}
