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
-- Name: api-registro; Type: SCHEMA; Schema: -; Owner: flexinventory
--

CREATE SCHEMA "api-registro";


ALTER SCHEMA "api-registro" OWNER TO flexinventory;

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
-- Name: user; Type: TABLE; Schema: api-registro; Owner: flexinventory
--

CREATE TABLE "api-registro"."user" (
    id smallint NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    state boolean NOT NULL,
    creation_date date NOT NULL,
    email character varying NOT NULL,
    tenant_uuid uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE "api-registro"."user" OWNER TO flexinventory;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: api-registro; Owner: flexinventory
--

CREATE SEQUENCE "api-registro".user_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "api-registro".user_id_seq OWNER TO flexinventory;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: api-registro; Owner: flexinventory
--

ALTER SEQUENCE "api-registro".user_id_seq OWNED BY "api-registro"."user".id;


--
-- Name: user id; Type: DEFAULT; Schema: api-registro; Owner: flexinventory
--

ALTER TABLE ONLY "api-registro"."user" ALTER COLUMN id SET DEFAULT nextval('"api-registro".user_id_seq'::regclass);


--
-- Data for Name: user; Type: TABLE DATA; Schema: api-registro; Owner: flexinventory
--

COPY "api-registro"."user" (id, name, password, state, creation_date, email, tenant_uuid) FROM stdin;
2	test	$2a$10$kjgDZNwIz5J4Ce690zZdrusLtOEC2uVOyF7jwpK/YtX.wiG/LvGmK	t	2025-11-13	testeo	739d36a3-bb1e-4213-a068-1cbcd4199069
\.


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: api-registro; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-registro".user_id_seq', 2, true);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: api-registro; Owner: flexinventory
--

ALTER TABLE ONLY "api-registro"."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user user_unique; Type: CONSTRAINT; Schema: api-registro; Owner: flexinventory
--

ALTER TABLE ONLY "api-registro"."user"
    ADD CONSTRAINT user_unique UNIQUE (email);


--
-- Name: user user_unique_email; Type: CONSTRAINT; Schema: api-registro; Owner: flexinventory
--

ALTER TABLE ONLY "api-registro"."user"
    ADD CONSTRAINT user_unique_email UNIQUE (email);


--
-- Name: user user_unique_tenant; Type: CONSTRAINT; Schema: api-registro; Owner: flexinventory
--

ALTER TABLE ONLY "api-registro"."user"
    ADD CONSTRAINT user_unique_tenant UNIQUE (tenant_uuid);


--
-- PostgreSQL database dump complete
--

