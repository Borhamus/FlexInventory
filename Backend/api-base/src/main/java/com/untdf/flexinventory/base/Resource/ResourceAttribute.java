package com.untdf.flexinventory.base.Resource;

import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.untdf.flexinventory.base.Service.ServiceAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;

import java.util.List;

@RestController
@RequestMapping("/attribute")
@CrossOrigin("*")
public class ResourceAttribute {

    @Autowired
    ServiceAttribute service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableAttribute>> getAllInventories(){
        return ResponseEntity.ok(service.getAllAttributes());
    }
}
