--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0 (Debian 17.0-1.pgdg120+1)
-- Dumped by pg_dump version 17.0 (Debian 17.0-1.pgdg120+1)

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
-- Name: api-users; Type: SCHEMA; Schema: -; Owner: flexinventory
--

CREATE SCHEMA "api-users";


ALTER SCHEMA "api-users" OWNER TO flexinventory;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    creation_date date NOT NULL,
    email character varying NOT NULL
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

COPY "api-users"."user" (id, name, password, state, creation_date, email) FROM stdin;
3	test	$2a$10$yAkBvnEiRXA4K2jePYr5e.mM3SLfFpKWrjjPbX3k5jSzhlO5XUzYy	t	2025-05-19	test
4	username	$2a$10$ek49uIgcm7ZEyXQeXEes8O1kKn1JU22c3bjfLmxI1VSstQcC0gxou	t	2025-05-19	email
\.


--
-- Data for Name: user_role; Type: TABLE DATA; Schema: api-users; Owner: flexinventory
--

COPY "api-users".user_role (id, id_role, id_user) FROM stdin;
\.


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
-- Name: user user_unique; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users"."user"
    ADD CONSTRAINT user_unique UNIQUE (email);


--
-- Name: user user_unique_email; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users"."user"
    ADD CONSTRAINT user_unique_email UNIQUE (email);


--
-- Name: user user_unique_name; Type: CONSTRAINT; Schema: api-users; Owner: flexinventory
--

ALTER TABLE ONLY "api-users"."user"
    ADD CONSTRAINT user_unique_name UNIQUE (name);


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

