--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.4 (Debian 17.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
    name text NOT NULL,
    CONSTRAINT attribute_type_check CHECK ((type = ANY (ARRAY['INTEGER'::text, 'REAL'::text, 'STRING'::text, 'BOOLEAN'::text])))
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
-- Name: catalog_item; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".catalog_item (
    catalog_id integer NOT NULL,
    item_id integer NOT NULL,
    organisation integer,
    id integer NOT NULL
);


ALTER TABLE "api-base".catalog_item OWNER TO flexinventory;

--
-- Name: catalog_item_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".catalog_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".catalog_item_id_seq OWNER TO flexinventory;

--
-- Name: catalog_item_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".catalog_item_id_seq OWNED BY "api-base".catalog_item.id;


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
-- Name: inventory_attribute; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".inventory_attribute (
    id integer NOT NULL,
    inventory_id integer NOT NULL,
    attribute_id integer NOT NULL
);


ALTER TABLE "api-base".inventory_attribute OWNER TO flexinventory;

--
-- Name: inventory_attribute_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".inventory_attribute_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".inventory_attribute_id_seq OWNER TO flexinventory;

--
-- Name: inventory_attribute_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".inventory_attribute_id_seq OWNED BY "api-base".inventory_attribute.id;


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
    inventory_id integer
);


ALTER TABLE "api-base".item OWNER TO flexinventory;

--
-- Name: item_attribute_value; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".item_attribute_value (
    id integer NOT NULL,
    item_id integer NOT NULL,
    attribute_id integer NOT NULL,
    value text NOT NULL
);


ALTER TABLE "api-base".item_attribute_value OWNER TO flexinventory;

--
-- Name: item_attribute_value_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

CREATE SEQUENCE "api-base".item_attribute_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-base".item_attribute_value_id_seq OWNER TO flexinventory;

--
-- Name: item_attribute_value_id_seq; Type: SEQUENCE OWNED BY; Schema: api-base; Owner: flexinventory
--

ALTER SEQUENCE "api-base".item_attribute_value_id_seq OWNED BY "api-base".item_attribute_value.id;


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
-- Name: privilege; Type: TABLE; Schema: api-users; Owner: flexinventory
--

CREATE TABLE "api-users".privilege (
    id smallint NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE "api-users".privilege OWNER TO flexinventory;

--
-- Name: privilege_id_seq; Type: SEQUENCE; Schema: api-users; Owner: flexinventory
--

CREATE SEQUENCE "api-users".privilege_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-users".privilege_id_seq OWNER TO flexinventory;

--
-- Name: privilege_id_seq; Type: SEQUENCE OWNED BY; Schema: api-users; Owner: flexinventory
--

ALTER SEQUENCE "api-users".privilege_id_seq OWNED BY "api-users".privilege.id;


--
-- Name: privilege_role; Type: TABLE; Schema: api-users; Owner: flexinventory
--

CREATE TABLE "api-users".privilege_role (
    id smallint NOT NULL,
    id_privilege smallint NOT NULL,
    id_role smallint NOT NULL
);


ALTER TABLE "api-users".privilege_role OWNER TO flexinventory;

--
-- Name: privilege_role_id_seq; Type: SEQUENCE; Schema: api-users; Owner: flexinventory
--

CREATE SEQUENCE "api-users".privilege_role_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-users".privilege_role_id_seq OWNER TO flexinventory;

--
-- Name: privilege_role_id_seq; Type: SEQUENCE OWNED BY; Schema: api-users; Owner: flexinventory
--

ALTER SEQUENCE "api-users".privilege_role_id_seq OWNED BY "api-users".privilege_role.id;


--
-- Name: role; Type: TABLE; Schema: api-users; Owner: flexinventory
--

CREATE TABLE "api-users".role (
    id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE "api-users".role OWNER TO flexinventory;

--
-- Name: role_id_seq; Type: SEQUENCE; Schema: api-users; Owner: flexinventory
--

CREATE SEQUENCE "api-users".role_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-users".role_id_seq OWNER TO flexinventory;

--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: api-users; Owner: flexinventory
--

ALTER SEQUENCE "api-users".role_id_seq OWNED BY "api-users".role.id;


--
-- Name: user; Type: TABLE; Schema: api-users; Owner: flexinventory
--

CREATE TABLE "api-users"."user" (
    id smallint NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    state boolean NOT NULL,
    creation_date date NOT NULL
);


ALTER TABLE "api-users"."user" OWNER TO flexinventory;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: api-users; Owner: flexinventory
--

CREATE SEQUENCE "api-users".user_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-users".user_id_seq OWNER TO flexinventory;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: api-users; Owner: flexinventory
--

ALTER SEQUENCE "api-users".user_id_seq OWNED BY "api-users"."user".id;


--
-- Name: user_role; Type: TABLE; Schema: api-users; Owner: flexinventory
--

CREATE TABLE "api-users".user_role (
    id smallint NOT NULL,
    id_role smallint NOT NULL,
    id_user smallint NOT NULL
);


ALTER TABLE "api-users".user_role OWNER TO flexinventory;

--
-- Name: user_role_id_seq; Type: SEQUENCE; Schema: api-users; Owner: flexinventory
--

CREATE SEQUENCE "api-users".user_role_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-users".user_role_id_seq OWNER TO flexinventory;

--
-- Name: user_role_id_seq; Type: SEQUENCE OWNED BY; Schema: api-users; Owner: flexinventory
--

ALTER SEQUENCE "api-users".user_role_id_seq OWNED BY "api-users".user_role.id;


--
-- Name: attribute id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute ALTER COLUMN id SET DEFAULT nextval('"api-base".attribute_id_seq'::regclass);


--
-- Name: catalog id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog ALTER COLUMN id SET DEFAULT nextval('"api-base".catalog_id_seq'::regclass);


--
-- Name: catalog_item id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog_item ALTER COLUMN id SET DEFAULT nextval('"api-base".catalog_item_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory ALTER COLUMN id SET DEFAULT nextval('"api-base".inventory_id_seq'::regclass);


--
-- Name: inventory_attribute id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory_attribute ALTER COLUMN id SET DEFAULT nextval('"api-base".inventory_attribute_id_seq'::regclass);


--
-- Name: item id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item ALTER COLUMN id SET DEFAULT nextval('"api-base".item_id_seq'::regclass);


--
-- Name: item_attribute_value id; Type: DEFAULT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_attribute_value ALTER COLUMN id SET DEFAULT nextval('"api-base".item_attribute_value_id_seq'::regclass);


--
-- Name: privilege id; Type: DEFAULT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege ALTER COLUMN id SET DEFAULT nextval('"api-users".privilege_id_seq'::regclass);


--
-- Name: privilege_role id; Type: DEFAULT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege_role ALTER COLUMN id SET DEFAULT nextval('"api-users".privilege_role_id_seq'::regclass);


--
-- Name: role id; Type: DEFAULT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".role ALTER COLUMN id SET DEFAULT nextval('"api-users".role_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users"."user" ALTER COLUMN id SET DEFAULT nextval('"api-users".user_id_seq'::regclass);


--
-- Name: user_role id; Type: DEFAULT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".user_role ALTER COLUMN id SET DEFAULT nextval('"api-users".user_role_id_seq'::regclass);


--
-- Data for Name: attribute; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".attribute (id, type, name) FROM stdin;
1	STRING	Brand
2	INTEGER	Stock
3	REAL	Price
4	BOOLEAN	Available
\.


--
-- Data for Name: catalog; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".catalog (id, name, description, revision_date, creation_date) FROM stdin;
1	Electronics	Devices and gadgets	2024-10-15	2024-01-01
2	Home Appliances	Household essentials	\N	2024-02-01
3	Office Supplies	Items for office use	2024-11-01	2024-03-01
\.


--
-- Data for Name: catalog_item; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".catalog_item (catalog_id, item_id, organisation, id) FROM stdin;
1	1	\N	1
1	4	\N	2
2	2	\N	3
3	3	\N	4
1	1	\N	5
1	4	\N	6
2	2	\N	7
3	3	\N	8
1	1	\N	9
1	4	\N	10
2	2	\N	11
3	3	\N	12
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".inventory (id, name, description, revision_date, creation_date) FROM stdin;
1	Warehouse A	Main warehouse inventory	2024-10-10	2024-01-15
2	Store B	Retail store inventory	\N	2024-04-10
\.


--
-- Data for Name: inventory_attribute; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".inventory_attribute (id, inventory_id, attribute_id) FROM stdin;
1	1	1
2	1	2
3	1	3
4	2	1
5	2	3
\.


--
-- Data for Name: item; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".item (id, name, creation_date, inventory_id) FROM stdin;
3	Notebook	2024-06-15	\N
1	Laptop	2024-05-01	1
2	Refrigerator	2024-05-10	1
4	Microwave	2024-07-20	2
\.


--
-- Data for Name: item_attribute_value; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".item_attribute_value (id, item_id, attribute_id, value) FROM stdin;
9	1	1	Dell
10	1	2	50
11	1	3	1200.50
12	2	1	LG
13	2	2	30
14	2	3	800.00
15	4	1	Panasonic
16	4	3	150.00
\.


--
-- Data for Name: privilege; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users".privilege (id, name, description) FROM stdin;
\.


--
-- Data for Name: privilege_role; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users".privilege_role (id, id_privilege, id_role) FROM stdin;
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users".role (id, name) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users"."user" (id, name, password, state, creation_date) FROM stdin;
\.


--
-- Data for Name: user_role; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users".user_role (id, id_role, id_user) FROM stdin;
\.


--
-- Name: attribute_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".attribute_id_seq', 4, true);


--
-- Name: catalog_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".catalog_id_seq', 3, true);


--
-- Name: catalog_item_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".catalog_item_id_seq', 12, true);


--
-- Name: inventory_attribute_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".inventory_attribute_id_seq', 5, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".inventory_id_seq', 2, true);


--
-- Name: item_attribute_value_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".item_attribute_value_id_seq', 16, true);


--
-- Name: item_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".item_id_seq', 4, true);


--
-- Name: privilege_id_seq; Type: SEQUENCE SET; Schema: api-users; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-users".privilege_id_seq', 1, false);


--
-- Name: privilege_role_id_seq; Type: SEQUENCE SET; Schema: api-users; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-users".privilege_role_id_seq', 1, false);


--
-- Name: role_id_seq; Type: SEQUENCE SET; Schema: api-users; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-users".role_id_seq', 1, false);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: api-users; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-users".user_id_seq', 1, false);


--
-- Name: user_role_id_seq; Type: SEQUENCE SET; Schema: api-users; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-users".user_role_id_seq', 1, false);


--
-- Name: attribute attribute_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".attribute
    ADD CONSTRAINT attribute_pkey PRIMARY KEY (id);


--
-- Name: catalog_item catalog_item_pk; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog_item
    ADD CONSTRAINT catalog_item_pk PRIMARY KEY (id);


--
-- Name: catalog catalog_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog
    ADD CONSTRAINT catalog_pkey PRIMARY KEY (id);


--
-- Name: inventory_attribute inventory_attribute_inventory_id_attribute_id_key; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory_attribute
    ADD CONSTRAINT inventory_attribute_inventory_id_attribute_id_key UNIQUE (inventory_id, attribute_id);


--
-- Name: inventory_attribute inventory_attribute_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory_attribute
    ADD CONSTRAINT inventory_attribute_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: item_attribute_value item_attribute_value_item_id_attribute_id_key; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_attribute_value
    ADD CONSTRAINT item_attribute_value_item_id_attribute_id_key UNIQUE (item_id, attribute_id);


--
-- Name: item_attribute_value item_attribute_value_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_attribute_value
    ADD CONSTRAINT item_attribute_value_pkey PRIMARY KEY (id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: privilege privilege_name_key; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege
    ADD CONSTRAINT privilege_name_key UNIQUE (name);


--
-- Name: privilege privilege_pkey; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege
    ADD CONSTRAINT privilege_pkey PRIMARY KEY (id);


--
-- Name: privilege_role privilege_role_pkey; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege_role
    ADD CONSTRAINT privilege_role_pkey PRIMARY KEY (id);


--
-- Name: role role_name_key; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users"."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_role user_role_pkey; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (id);


--
-- Name: catalog_item catalog_item_catalog_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog_item
    ADD CONSTRAINT catalog_item_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES "api-base".catalog(id) ON DELETE CASCADE;


--
-- Name: catalog_item catalog_item_item_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".catalog_item
    ADD CONSTRAINT catalog_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES "api-base".item(id) ON DELETE CASCADE;


--
-- Name: inventory_attribute inventory_attribute_attribute_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory_attribute
    ADD CONSTRAINT inventory_attribute_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES "api-base".attribute(id) ON DELETE RESTRICT;


--
-- Name: inventory_attribute inventory_attribute_inventory_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory_attribute
    ADD CONSTRAINT inventory_attribute_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES "api-base".inventory(id) ON DELETE CASCADE;


--
-- Name: item_attribute_value item_attribute_value_attribute_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_attribute_value
    ADD CONSTRAINT item_attribute_value_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES "api-base".attribute(id) ON DELETE RESTRICT;


--
-- Name: item_attribute_value item_attribute_value_item_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item_attribute_value
    ADD CONSTRAINT item_attribute_value_item_id_fkey FOREIGN KEY (item_id) REFERENCES "api-base".item(id) ON DELETE CASCADE;


--
-- Name: item item_inventory_id_fkey; Type: FK CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".item
    ADD CONSTRAINT item_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES "api-base".inventory(id) ON DELETE SET NULL;


--
-- Name: privilege_role privilege_role_id_privilege_fkey; Type: FK CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege_role
    ADD CONSTRAINT privilege_role_id_privilege_fkey FOREIGN KEY (id_privilege) REFERENCES "api-users".privilege(id) ON DELETE CASCADE;


--
-- Name: privilege_role privilege_role_id_role_fkey; Type: FK CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".privilege_role
    ADD CONSTRAINT privilege_role_id_role_fkey FOREIGN KEY (id_role) REFERENCES "api-users".role(id) ON DELETE CASCADE;


--
-- Name: user_role user_role_id_role_fkey; Type: FK CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".user_role
    ADD CONSTRAINT user_role_id_role_fkey FOREIGN KEY (id_role) REFERENCES "api-users".role(id) ON DELETE CASCADE;


--
-- Name: user_role user_role_id_user_fkey; Type: FK CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users".user_role
    ADD CONSTRAINT user_role_id_user_fkey FOREIGN KEY (id_user) REFERENCES "api-users"."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

