# Sikai Finance - Guía de Despliegue en Firebase

## Requisitos Previos
1. Tener una cuenta en Firebase Console.
2. Tener instalado Firebase CLI: `npm install -g firebase-tools`.

## Pasos de Configuración

### 1. Crear Proyecto en Firebase
- Ir a [Firebase Console](https://console.firebase.google.com/).
- "Agregar proyecto" -> "Sikai Finance".

### 2. Login y Setup Local
```bash
firebase login
firebase init hosting
```
- Selecciona el proyecto que acabas de crear.
- ¿Usar carpeta publica actual? Escribe **`out`** (Para exportación estática) o configura para SSR con Cloud Functions (ver abajo).
- ¿Configurar como SPA (single-page app)? **Sí**.
- ¿Sobrescribir index.html? **No**.

### Opción A: Exportación Estática (Recomendado para PWA simple)
1. Modifica `next.config.ts`:
   ```typescript
   const nextConfig = {
     output: 'export',
     // ...
   };
   export default nextConfig;
   ```
2. Construye el proyecto:
   ```bash
   npm run build
   ```
   *Nota: `Image` component de Next.js no funciona por defecto en export estático, usa `<img>` estándar o un loader.*

3. Despliega:
   ```bash
   firebase deploy
   ```

### Opción B: SSR con Firebase Hosting (Más avanzado)
Requiere `firebase-frameworks` o configurar Cloud Functions.
1. Ejecuta:
   ```bash
   firebase experiments:enable webframeworks
   firebase init hosting
   ```
   Detectará Next.js automáticamente.
2. Despliega:
   ```bash
   firebase deploy
   ```

## Configuración PWA
Asegúrate de que `public/manifest.json` y los iconos estén presentes.

## Variables de Entorno
Configura tus variables de Supabase en Firebase:
```bash
firebase functions:config:set supabase.url="TU_URL" supabase.anon_key="TU_KEY"
```
