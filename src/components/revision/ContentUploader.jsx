import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { callOpenAI } from '@/components/utils/openai';
import { Upload, FileText, Image, Loader2, X } from 'lucide-react';

/**
 * ContentUploader - Handles text input and file uploads for revision content
 * 
 * Supports:
 * - Direct text paste for notes/vocabulary
 * - Image upload (screenshots of notes, textbook pages)
 * - PDF upload (worksheets, revision guides)
 * 
 * Uses Core.UploadFile to store files, then Core.InvokeLLM with file_urls
 * to extract content from images/PDFs.
 */
export default function ContentUploader({ onContentExtracted, onCancel }) {
  const [mode, setMode] = useState('text'); // text, file
  const [textContent, setTextContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle file upload and extract content
   * 1. Upload file using Core.UploadFile
   * 2. Use InvokeLLM with file_urls to extract key concepts
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadedFile(file);

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract content from the uploaded file using OpenAI vision
      const extractedContent = await callOpenAI(
        `Analyze this uploaded file and extract all key concepts, vocabulary, definitions, and facts that would be useful for revision.

Return the extracted content as JSON with topics array, key_concepts array (with term and definition), facts array, vocabulary array (with word and meaning), and a summary string.`,
        {
          type: "object",
          properties: {
            topics: { type: "array", items: { type: "string" } },
            key_concepts: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" }
                },
                required: ["term", "definition"],
                additionalProperties: false
              } 
            },
            facts: { type: "array", items: { type: "string" } },
            vocabulary: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  word: { type: "string" },
                  meaning: { type: "string" }
                },
                required: ["word", "meaning"],
                additionalProperties: false
              } 
            },
            summary: { type: "string" }
          },
          required: ["topics", "key_concepts", "facts", "vocabulary", "summary"],
          additionalProperties: false
        },
        [file_url]
      );

      onContentExtracted(extractedContent, file_url);
    } catch (error) {
      console.error('Error processing file:', error);
    }

    setIsProcessing(false);
  };

  /**
   * Handle text content submission
   * Parse the text to extract key concepts
   */
  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    setIsProcessing(true);

    try {
      // Use OpenAI to extract and structure the text content
      const extractedContent = await callOpenAI(
        `Analyze this revision content and extract all key concepts, vocabulary, definitions, and facts.

Content:
${textContent}

Return the extracted content as JSON with topics array, key_concepts array (with term and definition), facts array, vocabulary array (with word and meaning), and a summary string.`,
        {
          type: "object",
          properties: {
            topics: { type: "array", items: { type: "string" } },
            key_concepts: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" }
                },
                required: ["term", "definition"],
                additionalProperties: false
              } 
            },
            facts: { type: "array", items: { type: "string" } },
            vocabulary: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  word: { type: "string" },
                  meaning: { type: "string" }
                },
                required: ["word", "meaning"],
                additionalProperties: false
              } 
            },
            summary: { type: "string" }
          },
          required: ["topics", "key_concepts", "facts", "vocabulary", "summary"],
          additionalProperties: false
        }
      );

      onContentExtracted(extractedContent, null);
    } catch (error) {
      console.error('Error processing text:', error);
    }

    setIsProcessing(false);
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'text' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Paste Text
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'file' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-600 hover:bg-white/50'
          }`}
        >
          <Image className="w-4 h-4" />
          Upload Image/PDF
        </button>
      </div>

      {/* Text Mode */}
      {mode === 'text' && (
        <div className="space-y-3">
          <Textarea
            placeholder="Paste your notes, vocabulary list, or revision content here..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="min-h-[150px] bg-white"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || isProcessing}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Extract Content'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* File Mode */}
      {mode === 'file' && (
        <div className="space-y-3">
          {!uploadedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-white/50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-600">Click to upload image or PDF</span>
              <span className="text-xs text-slate-400 mt-1">PNG, JPG, or PDF</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <FileText className="w-8 h-8 text-indigo-500" />
              <div className="flex-1">
                <p className="font-medium text-slate-700">{uploadedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {isProcessing ? 'Processing...' : 'Ready'}
                </p>
              </div>
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setUploadedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}