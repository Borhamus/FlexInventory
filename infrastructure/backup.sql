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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: inventory; Type: TABLE; Schema: api-base; Owner: flexinventory
--

CREATE TABLE "api-base".inventory (
    id smallint NOT NULL,
    name character varying NOT NULL,
    "user" character varying NOT NULL,
    description character varying,
    revision_date date,
    creation_date date NOT NULL
);


ALTER TABLE "api-base".inventory OWNER TO flexinventory;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: api-base; Owner: flexinventory
--

ALTER TABLE "api-base".inventory ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "api-base".inventory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: api-base; Owner: flexinventory
--

COPY "api-base".inventory (id, name, "user", description, revision_date, creation_date) FROM stdin;
5	Inventario 1	Milton Gómez	Test de Spring 1	\N	2024-10-18
6	Inventario 2	Milton Gómez	Test de Spring 2	\N	2024-10-18
7	Inventario 3	Milton Gómez	Test de Spring 3	\N	2024-10-18
8	Inventario 4	Milton Gómez	Test de Spring 4	\N	2024-10-18
\.


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: api-base; Owner: flexinventory
--

SELECT pg_catalog.setval('"api-base".inventory_id_seq', 8, true);


--
-- Name: inventory inventory_pk; Type: CONSTRAINT; Schema: api-base; Owner: flexinventory
--

ALTER TABLE ONLY "api-base".inventory
    ADD CONSTRAINT inventory_pk PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

