import asyncio
import os
import json
from typing import List, Dict, Any
from app.tool.base import BaseTool

try:
    from serpapi import GoogleSearch
except ImportError:
    GoogleSearch = None

class SerpScraper(BaseTool):
    name: str = "serp_scraper"
    description: str = """Perform a high-detail Google SERP search and return rich data (titles, links, snippets).
Use this when you need deep search results, ad data, or related questions.
Requires a SERPAPI_API_KEY. If missing, use google_search tool instead.
"""
    parameters: dict = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "(required) The search query.",
            },
            "num_results": {
                "type": "integer",
                "description": "(optional) Number of results to return.",
                "default": 10,
            }
        },
        "required": ["query"],
    }

    async def execute(self, query: str, num_results: int = 10) -> Any:
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key or not GoogleSearch:
            return "Error: SERPAPI_API_KEY not found or serpapi package missing. Use google_search instead."

        params = {
            "q": query,
            "api_key": api_key,
            "engine": "google",
            "num": num_results
        }

        loop = asyncio.get_event_loop()
        try:
            search_obj = await loop.run_in_executor(None, lambda: GoogleSearch(params))
            results = await loop.run_in_executor(None, lambda: search_obj.get_dict())
            
            organic = results.get("organic_results", [])
            output = []
            for item in organic[:num_results]:
                output.append({
                    "title": item.get("title"),
                    "link": item.get("link"),
                    "snippet": item.get("snippet"),
                    "position": item.get("position")
                })
            
            return json.dumps(output, indent=2)
        except Exception as e:
            return f"Error executing SERP scraper: {str(e)}"
