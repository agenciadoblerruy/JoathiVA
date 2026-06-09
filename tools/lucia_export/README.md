# Exportador de datos publicos de Sistema Lucia / DNA Uruguay

Herramienta operativa para inventariar y descargar datos publicos oficiales de la Direccion Nacional de Aduanas vinculados al Sistema Lucia.

## Fuentes oficiales cubiertas

- FTP publico anonimo de DNA: `ftp://ftp.aduanas.gub.uy/DUA%20Diarios%20XML/`
- Catalogo Nacional de Datos Abiertos: datasets de organizacion `dna` etiquetados como `DNA`

La herramienta conserva los archivos originales publicados por la fuente y genera manifiestos CSV para trazabilidad.

## Uso recomendado

Primero estimar volumen sin descargar:

```bash
python3 tools/lucia_export/export_lucia_public_data.py --dry-run --source all --years 2016-2026
```

Descargar todo el periodo publico recomendado por DNA/MEF:

```bash
python3 tools/lucia_export/export_lucia_public_data.py --source all --years 2016-2026 --delay 0.2
```

Descargar un ano puntual para validar:

```bash
python3 tools/lucia_export/export_lucia_public_data.py --source ftp --years 2026 --max-files 5
```

Descargar todo lo listado en el FTP, incluidos anos anteriores si la fuente los mantiene visibles:

```bash
python3 tools/lucia_export/export_lucia_public_data.py --source ftp --years all --delay 0.2
```

## Salida

Por defecto escribe en:

```text
data/lucia_public_export/
  raw/
    ftp_dua_diarios_xml/
    catalogodatos_dna/
  manifests/
    ftp_root_manifest.csv
    ftp_files_manifest.csv
    catalogodatos_packages_manifest.csv
    catalogodatos_resources_manifest.csv
```

## Criterios de seguridad y cumplimiento

- Solo accede a fuentes publicas/anonymas u oficiales.
- No usa credenciales.
- No intenta consultar endpoints restringidos de Sistema Lucia.
- No modifica ni transforma el contenido fuente en esta etapa.
- Mantiene `source_url`, nombre de archivo, tamano y ruta local para auditoria.

## Notas tecnicas

La documentacion oficial del FTP indica que los archivos DUA estan en XML y usan esta nomenclatura:

- `DD`: archivos diarios
- `DM`: archivos mensuales
- `Ing`: DUAs ingresados
- `Mod`: DUAs modificados
- `Anu`: DUAs anulados

Para una base consolidada operativa, el siguiente paso deberia ser un proceso ETL separado que aplique la regla oficial: cargar ingresados, reemplazar modificados por `DDNUME_CORRE_PUBLICO` y eliminar anulados.

## Generador de ZC PDF

Se agrego un ejecutable de escritorio para armar ZC en PDF desde capturas y facturas `FACTURA BT`.

Archivo:

`tools/lucia_export/LuciaZCGenerator.exe`

Al abrirlo muestra una ventana para elegir:

- flujo `OLAVERRY`
- flujo `Bonjour`
- carpeta de capturas
- carpeta de facturas
- carpeta de CRT
- carpeta base de salida
- cantidad de ZC a generar

Por defecto toma primero las capturas sin renombrar, ordenadas por fecha, y genera solo el primer ZC en PDF.

La salida ya no se deja plana en la carpeta elegida. En su lugar, la app crea una carpeta de corrida con el formato:

```text
Proveedor_DDMMYY
```

Ejemplos:

```text
Olaverry_040626
BT_040626
```

Dentro de esa carpeta se crean estas subcarpetas:

```text
CRT/
FACTURAS/
ZC/
```

- `CRT` recibe los PDFs de CRT usados en la corrida.
- `FACTURAS` recibe las facturas detectadas para esa corrida.
- `ZC` recibe los PDFs generados.

Al terminar la corrida, la carpeta base elegida se limpia y queda solamente la carpeta de la corrida actual.

El nombre final del PDF queda con el formato del flujo elegido:

```text
Bonjour:  ZC<ZC>_DUA_<DUA>_CRT_<CRT>.pdf
OLAVERRY: ZC<ZC>_DUA_<DUA>_CRT_<CRT>.pdf
```

En `OLAVERRY`, el CRT se normaliza para quitar prefijos numéricos como `033`, de modo que
`033AR148726497` y `AR148726497` terminen en el mismo nombre compuesto.

## Nombres compuestos desde facturas

La lectura de facturas ya no depende solo del nombre del PDF. La app intenta leer cualquier PDF de la carpeta de facturas y arma el nombre compuesto a partir de los campos detectados en el texto:

- `ZC`
- `DUA`
- `CRT`

Reglas actuales:

- `ZC26000398_DUA_784702_CRT_AR148726497.pdf` se genera correctamente desde `Referencia: ZC 2600398 . DUA 784702` y `CRT: AR 148726497`.
- Si el `ZC` ya viene completo con 8 dígitos, se conserva como está.
- Si el `ZC` viene abreviado, la app completa el prefijo de año de forma operativa.
- Los PDFs generados con nombre `ZC_...` o `ZC...` no se reinyectan como factura de entrada.

## Correo preparado

Después de generar los PDFs, la app crea también un borrador `.eml` en la carpeta de salida con:

- destinatarios: `gabriel.ferraro@petrocuyo.com`, `mauro.saez@petrocuyo.com`
- asunto:
  - `Documentación Olaverry`
  - `Documentación BT`
- cuerpo:
  - `Adjunto la documentación correspondiente a los fletes realizados.`

El borrador incluye como adjuntos los PDFs generados en esa corrida.

El correo preparado adjunta los PDFs dentro de:

- `CRT`
- `FACTURAS`
- `ZC`

## Logos opcionales

Si querés que la pantalla inicial muestre los logos en lugar de los botones de texto, colocá archivos PNG/JPG en:

- `tools/lucia_export/assets/olaverry.png`
- `tools/lucia_export/assets/bt.png`

La app los detecta automáticamente si existen.
