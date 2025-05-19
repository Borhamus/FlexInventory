package com.untdf.flexinventory.users.Transformer;

import com.untdf.flexinventory.users.Model.User;
import com.untdf.flexinventory.users.Transferable.TransferableUser;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TransformerUser {

    TransferableUser toDTO (User user);

    @InheritInverseConfiguration
    User toEntity (TransferableUser transferableUser);
}
