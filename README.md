# Site GitHub Pages

Publique o conteudo desta pasta (`github_pages`) no GitHub Pages.

## Como usar

1. Copie `index.html`, `styles.css` e `app.js` para um repositorio GitHub.
2. No GitHub, acesse `Settings > Pages`.
3. Escolha a branch e a pasta que contem estes arquivos.
4. Abra a URL gerada pelo GitHub Pages.

O site ja vem apontando para a URL atual do Apps Script:

```text
https://script.google.com/macros/s/AKfycbxAxUus03Hx0Q6B7NIDDM1-lYn2hmcyq1flfl6DEY0HCsPa2uq6iWuYLz2XKexsNmGs/exec
```

Se a implantacao do Apps Script mudar, altere `DEFAULT_SCRIPT_URL` em `app.js`.

## Banco de horas

O calculo soma pares `Entrada` -> `Saida` por operador dentro do filtro atual. Entradas sem saida correspondente ficam em aberto e nao entram no total.
