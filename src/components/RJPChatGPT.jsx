import React, { useMemo, useState } from "react";
import { OPENAI_CONFIG, getOpenAIKey } from "../config/openaiConfig";
import "./RJPChatGPT.css";

const SYSTEM_PROMPT = `És o assistente técnico e académico da RJP_Study.
Responde sempre em português de Portugal, de forma clara, direta e passo a passo.
Contexto do utilizador: trabalhador-estudante de Engenharia Civil em Portugal.
Disciplinas principais: Resistência dos Materiais II, Estruturas, Mecânica dos Solos II e Betão Armado.
Quando resolveres exercícios:
1. Identifica os dados.
2. Explica a teoria/formulário usado.
3. Resolve por etapas.
4. Mostra unidades.
5. Faz uma verificação final do resultado.
6. Quando existirem Eurocódigos, indica a lógica de verificação, sem substituir validação profissional.`;

const QUICK_PROMPTS = [
  {
    label: "Resolver exercício",
    text: "Resolve este exercício passo a passo, como aluno de Engenharia Civil em Portugal. Explica os dados, fórmulas, unidades e resultado final.",
  },
  {
    label: "Explicar matéria",
    text: "Explica esta matéria de forma simples, com exemplos práticos e ligação à Engenharia Civil.",
  },
  {
    label: "Preparar exame",
    text: "Cria um plano de estudo para esta matéria, com tópicos prioritários, exercícios tipo e erros comuns em exame.",
  },
  {
    label: "Corrigir resposta",
    text: "Corrige a minha resposta, identifica erros, melhora a estrutura e diz que cotação provável teria num exame.",
  },
  {
    label: "Gerar perguntas",
    text: "Gera perguntas de treino e pequenas questões de exame sobre esta matéria, com soluções resumidas.",
  },
  {
    label: "Resumir apontamentos",
    text: "Resume estes apontamentos para estudo rápido, com fórmulas principais, conceitos-chave e alertas de exame.",
  },
];

function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;

  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) chunks.push(content.text);
      if (content?.type === "text" && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RJPChatGPT({ contexto = "", disciplina = "RJP_Study" }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState("");

  const apiKey = useMemo(() => getOpenAIKey(), []);

  const handleImage = async (e) => {
    setError("");

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Escolhe uma imagem/foto válida.");
      return;
    }

    try {
      setImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch {
      setError("Não foi possível ler a imagem.");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageDataUrl("");
  };

  const askChatGPT = async () => {
    setError("");
    setAnswer("");

    if (!apiKey) {
      setError("Falta configurar a API Key em src/config/openaiConfig.js ou em VITE_OPENAI_API_KEY.");
      return;
    }

    if (!question.trim() && !imageDataUrl) {
      setError("Escreve a pergunta ou escolhe uma foto/imagem antes de enviar.");
      return;
    }

    setLoading(true);

    try {
      const userContent = [
        {
          type: "input_text",
          text: `Disciplina/área: ${disciplina}

Contexto da app/documentos:
${contexto || "Sem contexto adicional."}

Pedido do Rui:
${question || "Analisa a imagem anexada e explica o que vês de forma útil para estudo."}`,
        },
      ];

      if (imageDataUrl) {
        userContent.push({
          type: "input_image",
          image_url: imageDataUrl,
        });
      }

      const payload = {
        model: OPENAI_CONFIG.model,
        temperature: OPENAI_CONFIG.temperature,
        max_output_tokens: OPENAI_CONFIG.maxOutputTokens,
        input: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      };

      const res = await fetch(OPENAI_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `Erro HTTP ${res.status}`);
      }

      const text = extractOutputText(data);
      setAnswer(text || "A resposta veio vazia. Confirma o modelo/API Key.");
    } catch (err) {
      setError(err.message || "Erro ao ligar ao ChatGPT.");
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = async () => {
    if (!answer) return;
    await navigator.clipboard?.writeText(answer);
  };

  return (
    <div className="rjp-chatgpt-box">
      <button className="rjp-chatgpt-main-btn" onClick={() => setOpen(!open)}>
        🤖 Perguntar ao ChatGPT
      </button>

      {open && (
        <div className="rjp-chatgpt-panel">
          <div className="rjp-chatgpt-header">
            <strong>Assistente RJP_Study</strong>
            <span>Exames · Exercícios · Fotos · Explicações</span>
          </div>

          <div className="rjp-chatgpt-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button key={p.label} onClick={() => setQuestion(p.text + "\n\n")}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="rjp-chatgpt-upload">
            <label className="rjp-chatgpt-upload-btn">
              📷 Tirar foto / 🖼️ Escolher imagem
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
                style={{ display: "none" }}
              />
            </label>

            {imageFile && (
              <div className="rjp-chatgpt-file">
                <span>Imagem: {imageFile.name}</span>
                <button type="button" onClick={removeImage} disabled={loading}>
                  Remover
                </button>
              </div>
            )}

            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Imagem escolhida"
                className="rjp-chatgpt-preview"
              />
            )}
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Exemplo: Resolve a pergunta 2. Explica a pergunta 3 com toda a teoria necessária. Usa passos, fórmulas e unidades."
          />

          <div className="rjp-chatgpt-actions">
            <button onClick={askChatGPT} disabled={loading}>
              {loading ? "A responder..." : "🚀 Enviar ao ChatGPT"}
            </button>
            <button onClick={() => setQuestion("")} disabled={loading}>
              Limpar pergunta
            </button>
            <button onClick={copyAnswer} disabled={!answer}>
              Copiar resposta
            </button>
          </div>

          {error && <div className="rjp-chatgpt-error">⚠️ {error}</div>}

          {answer && (
            <div className="rjp-chatgpt-answer">
              <pre>{answer}</pre>
            </div>
          )}

          <div className="rjp-chatgpt-note">
            Uso académico. Confirma sempre resultados técnicos antes de usar em projeto real.
          </div>
        </div>
      )}
    </div>
  );
}
