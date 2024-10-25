--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3 (Debian 16.3-1.pgdg120+1)
-- Dumped by pg_dump version 16.3 (Debian 16.3-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api-base; Type: SCHEMA; Schema: -; Owner: flexinventory
--

CREATE SCHEMA "api-base";


ALTER SCHEMA "api-base" OWNER TO flexinventory;

--
-- Name: api-users; Type: SCHEMA; Schema: -; Owner: flexinventory
--

CREATE SCHEMA "api-users";


ALTER SCHEMA "api-users" OWNER TO flexinventory;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attribute; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".attribute (
    id integer NOT NULL,
    type text NOT NULL,
    name text NOT NULL
);


ALTER TABLE "api-base".attribute OWNER TO flexinventory;

--
-- Name: attribute_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".attribute_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".attribute_id_seq OWNER TO flexinventory;

--
-- Name: attribute_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".attribute_id_seq OWNED BY "api-base".attribute.id;


--
-- Name: attribute_item; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".attribute_item (
    id integer NOT NULL,
    attribute_id smallint,
    item_id integer,
    inventory_id smallint,
    value text NOT NULL
);


ALTER TABLE "api-base".attribute_item OWNER TO flexinventory;

--
-- Name: attribute_item_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".attribute_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".attribute_item_id_seq OWNER TO flexinventory;

--
-- Name: attribute_item_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".attribute_item_id_seq OWNED BY "api-base".attribute_item.id;


--
-- Name: catalog; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".catalog (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    revision_date date,
    creation_date date NOT NULL
);


ALTER TABLE "api-base".catalog OWNER TO flexinventory;

--
-- Name: catalog_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".catalog_id_seq OWNER TO flexinventory;

--
-- Name: catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".catalog_id_seq OWNED BY "api-base".catalog.id;


--
-- Name: inventory; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".inventory (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    revision_date date,
    creation_date date NOT NULL
);


ALTER TABLE "api-base".inventory OWNER TO flexinventory;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".inventory_id_seq OWNER TO flexinventory;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".inventory_id_seq OWNED BY "api-base".inventory.id;


--
-- Name: item; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".item (
    id integer NOT NULL,
    name text NOT NULL,
    creation_date date NOT NULL,
    catalog_id smallint
);


ALTER TABLE "api-base".item OWNER TO flexinventory;

--
-- Name: item_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".item_id_seq OWNER TO flexinventory;

--
-- Name: item_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".item_id_seq OWNED BY "api-base".item.id;


--
-- Name: item_tag; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".item_tag (
    id integer NOT NULL,
    item_id integer,
    tag_id smallint
);


ALTER TABLE "api-base".item_tag OWNER TO flexinventory;

--
-- Name: item_tag_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".item_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".item_tag_id_seq OWNER TO flexinventory;

--
-- Name: item_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".item_tag_id_seq OWNED BY "api-base".item_tag.id;


--
-- Name: tag; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".tag (
    id integer NOT NULL,
    color text,
    name text NOT NULL
);


ALTER TABLE "api-base".tag OWNER TO flexinventory;

--
-- Name: tag_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".tag_id_seq OWNER TO flexinventory;

--
-- Name: tag_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".tag_id_seq OWNED BY "api-base".tag.id;


--
-- Name: attribute id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute ALTER COLUMN id SET DEFAULT nextval('"api-base".attribute_id_seq'::regclass);


--
-- Name: attribute_item id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute_item ALTER COLUMN id SET DEFAULT nextval('"api-base".attribute_item_id_seq'::regclass);


--
-- Name: catalog id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog ALTER COLUMN id SET DEFAULT nextval('"api-base".catalog_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory ALTER COLUMN id SET DEFAULT nextval('"api-base".inventory_id_seq'::regclass);


--
-- Name: item id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item ALTER COLUMN id SET DEFAULT nextval('"api-base".item_id_seq'::regclass);


--
-- Name: item_tag id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_tag ALTER COLUMN id SET DEFAULT nextval('"api-base".item_tag_id_seq'::regclass);


--
-- Name: tag id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".tag ALTER COLUMN id SET DEFAULT nextval('"api-base".tag_id_seq'::regclass);


--
-- Data for Name: attribute; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".attribute (id, type, name) FROM stdin;
1	INTEGER	Unidades
2	REAL	Precio
3	STRING	Descripcion
4	DATE	Vencimiento
5	STRING	Marca
6	STRING	Tipo
\.


--
-- Data for Name: attribute_item; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".attribute_item (id, attribute_id, item_id, inventory_id, value) FROM stdin;
1	1	2	3	200
2	2	2	3	2900
3	3	2	3	Gaseosa de la marca Coca-Cola
4	4	2	3	2027-01-01
5	5	2	3	Coca-Cola
7	6	2	3	Bebida-Carbonatada
\.


--
-- Data for Name: catalog; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".catalog (id, name, description, revision_date, creation_date) FROM stdin;
1	Catalogo 1	Test de Catalogos!	\N	2024-10-25
2	Catalogo 2	Test de Catalogos! Soy otro!	\N	2024-10-25
3	Mis cosas	Mis cosas diversas!!	\N	2024-10-25
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".inventory (id, name, description, revision_date, creation_date) FROM stdin;
1	Inventario 1	test de inventario!!!	\N	2024-10-25
2	Inventario 2	soy otro inventario!!	\N	2024-10-25
3	Kiosco	Solo almaceno alimentos	\N	2024-10-25
\.


--
-- Data for Name: item; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".item (id, name, creation_date, catalog_id) FROM stdin;
6	Transformer	2024-10-25	\N
7	Miel	2024-10-25	\N
8	VIaje al centro de la tierra	2024-10-25	\N
1	Gundam	2024-10-25	3
3	El señor de los Anillos	2024-10-25	3
5	Doritos	2024-10-25	3
9	Berserk	2024-10-25	3
2	Coca-Cola	2024-10-25	3
4	Pepsi	2024-10-25	\N
\.


--
-- Data for Name: item_tag; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".item_tag (id, item_id, tag_id) FROM stdin;
1	1	4
2	3	3
3	2	2
\.


--
-- Data for Name: tag; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".tag (id, color, name) FROM stdin;
2	\N	Comestibles
3	\N	No comestibles
4	\N	Juguetería
\.


--
-- Name: attribute_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".attribute_id_seq', 6, true);


--
-- Name: attribute_item_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".attribute_item_id_seq', 7, true);


--
-- Name: catalog_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".catalog_id_seq', 4, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".inventory_id_seq', 3, true);


--
-- Name: item_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".item_id_seq', 9, true);


--
-- Name: item_tag_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".item_tag_id_seq', 3, true);


--
-- Name: tag_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".tag_id_seq', 4, true);


--
-- Name: attribute_item attribute_item_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute_item
    ADD CONSTRAINT attribute_item_pkey PRIMARY KEY (id);


--
-- Name: attribute attribute_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute
    ADD CONSTRAINT attribute_pkey PRIMARY KEY (id);


--
-- Name: catalog catalog_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog
    ADD CONSTRAINT catalog_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: item_tag item_tag_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_tag
    ADD CONSTRAINT item_tag_pkey PRIMARY KEY (id);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (id);


--
-- Name: attribute_item attribute_item_attribute_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute_item
    ADD CONSTRAINT attribute_item_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES "api-base".attribute(id) ON DELETE CASCADE;


--
-- Name: attribute_item attribute_item_inventory_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute_item
    ADD CONSTRAINT attribute_item_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES "api-base".inventory(id) ON DELETE CASCADE;


--
-- Name: attribute_item attribute_item_item_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute_item
    ADD CONSTRAINT attribute_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES "api-base".item(id) ON DELETE CASCADE;


--
-- Name: item item_catalog_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item
    ADD CONSTRAINT item_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES "api-base".catalog(id) ON DELETE RESTRICT;


--
-- Name: item_tag item_tag_item_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_tag
    ADD CONSTRAINT item_tag_item_id_fkey FOREIGN KEY (item_id) REFERENCES "api-base".item(id) ON DELETE CASCADE;


--
-- Name: item_tag item_tag_tag_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_tag
    ADD CONSTRAINT item_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES "api-base".tag(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

