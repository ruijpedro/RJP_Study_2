# RJP Study

Versão baseada no RJP Study com sincronização APK ↔ WebApp através de Google Apps Script, Google Sheets e Google Drive.

## Estrutura Drive recomendada

```text
RJP_Study/
├── Disciplina 1/
│   ├── Exames/
│   ├── Apontamentos/
│   ├── Aulas/
│   ├── Fichas/
│   ├── Resumos/
│   ├── Trabalhos/
│   ├── Testes/
│   ├── Imagens/
│   ├── Vídeos/
│   └── Outros/
└── Disciplina 2/
```

## Apps Script

1. Criar Google Sheet: `RJP_Study_DB`
2. Extensões → Apps Script
3. Colar `google-apps-script/Code.gs`
4. Executar `setup`
5. Implementar como Aplicação Web: executar como **Eu**, acesso **Qualquer pessoa**
6. Copiar URL `/exec` para a app em **Google/Drive**.

## Sincronização

Na app usar:
- **Sincronizar Drive** para ler as pastas do Drive.
- **Guardar tudo na Cloud** para enviar dados para Sheets.
- **Carregar da Cloud** para atualizar APK/WebApp.
- **🔄 Sincronizar** para executar o ciclo completo.
