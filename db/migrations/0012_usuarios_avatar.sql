-- Avatar de usuarios: el binario vive en R2; D1 solo guarda key y content-type.
ALTER TABLE usuarios
ADD COLUMN avatar_key TEXT;

ALTER TABLE usuarios
ADD COLUMN avatar_content_type TEXT;
