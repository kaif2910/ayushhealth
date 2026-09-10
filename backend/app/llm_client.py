"""Swappable LLM client for Gemini or Groq.

Set LLM_PROVIDER=gemini|groq and LLM_API_KEY in the environment.
If no key is configured, callers should use deterministic fallbacks so the
hackathon demo remains functional without a paid or external dependency.
"""

import os
from dataclasses import dataclass


@dataclass
class LLMResponse:
    text: str
    provider: str


class LLMUnavailable(RuntimeError):
    pass


def _provider() -> str:
    return os.getenv("LLM_PROVIDER", "gemini").strip().lower()


def is_configured() -> bool:
    return bool(os.getenv("LLM_API_KEY", "").strip())


def generate_text(prompt: str) -> LLMResponse:
    api_key = os.getenv("LLM_API_KEY", "").strip()
    provider = _provider()
    if not api_key:
        raise LLMUnavailable("LLM_API_KEY is not configured")

    if provider == "gemini":
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if not text:
                raise LLMUnavailable("Gemini returned an empty response")
            return LLMResponse(text=text, provider="gemini")
        except LLMUnavailable:
            raise
        except Exception as exc:  # provider/network errors must never break intake
            raise LLMUnavailable(f"Gemini call failed: {exc}") from exc

    if provider == "groq":
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a clinical intake structuring assistant. Never diagnose.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
            )
            text = completion.choices[0].message.content
            if not text:
                raise LLMUnavailable("Groq returned an empty response")
            return LLMResponse(text=text, provider="groq")
        except LLMUnavailable:
            raise
        except Exception as exc:
            raise LLMUnavailable(f"Groq call failed: {exc}") from exc

    raise LLMUnavailable(f"Unsupported LLM_PROVIDER={provider!r}; use gemini or groq")
