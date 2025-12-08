import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化 Gemini API
// 注意：API Key 應該從環境變數讀取，這裡先使用一個配置
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// 調試信息：檢查環境變數是否正確讀取
if (import.meta.env.DEV) {
  console.log('🔍 環境變數檢查:', {
    hasKey: !!API_KEY,
    keyLength: API_KEY.length,
    keyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : 'N/A',
    allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('GEMINI'))
  });
}

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY 未設置，請在 .env 文件中設置 API Key');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface DesktopFile {
  id: string;
  label: string;
  type: string;
}

export interface Tag {
  name: string;
  description?: string;
  color?: string;
}

export interface TagAssignment {
  tagName: string;
  files: string[];
}

/**
 * 使用 Gemini API 分析桌面檔案並生成標籤
 */
export async function generateTagsFromFiles(files: DesktopFile[]): Promise<Tag[]> {
  if (!genAI) {
    throw new Error('Gemini API Key 未設置');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const fileList = files.map(f => `- ${f.label} (${f.type})`).join('\n');

  const prompt = `你是一個桌面檔案管理助手。請分析以下桌面上的檔案，並建議合適的分類標籤（tags）。

桌面檔案列表：
${fileList}

請根據檔案的類型、用途、內容等特徵，建議 3-8 個分類標籤。每個標籤應該：
1. 名稱簡潔明確（2-4 個字）
2. 能夠涵蓋相關的檔案
3. 標籤之間有明確的區別

請以 JSON 格式回覆，格式如下：
{
  "tags": [
    {
      "name": "標籤名稱",
      "description": "標籤描述（可選）",
      "color": "#60a5fa"
    }
  ]
}

只回覆 JSON，不要包含其他文字。`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 嘗試解析 JSON（可能包含 markdown 代碼塊）
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);
    
    // 確保返回的格式正確
    if (parsed.tags && Array.isArray(parsed.tags)) {
      return parsed.tags.map((tag: any) => ({
        name: tag.name || '未命名標籤',
        description: tag.description,
        color: tag.color || getRandomColor(),
      }));
    }

    throw new Error('API 返回格式不正確');
  } catch (error) {
    console.error('生成標籤時發生錯誤:', error);
    throw error;
  }
}

/**
 * 使用 Gemini API 根據現有標籤分配檔案
 */
export async function assignFilesToTags(
  files: DesktopFile[],
  existingTags: { name: string; items: string[] }[]
): Promise<TagAssignment[]> {
  if (!genAI) {
    throw new Error('Gemini API Key 未設置');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const fileList = files.map(f => `- ${f.label} (類型: ${f.type})`).join('\n');
  const tagList = existingTags.map(t => `- ${t.name} (已有 ${t.items.length} 個檔案)`).join('\n');

  const prompt = `你是一個桌面檔案管理助手。請根據現有的標籤，將桌面上的檔案分配到對應的標籤下。

桌面檔案列表：
${fileList}

現有標籤：
${tagList}

請分析每個檔案的特性，並將它們分配到最合適的標籤下。一個檔案可以屬於多個標籤。

重要：在返回的 JSON 中，files 陣列中的檔案名稱必須完全匹配上述列表中的檔案名稱（只包含檔案名稱，不包含類型信息）。

例如，如果列表中有 "Organizer (類型: app)"，則返回時只寫 "Organizer"，不要包含 "(類型: app)" 或任何其他信息。

請以 JSON 格式回覆，格式如下：
{
  "assignments": [
    {
      "tagName": "標籤名稱",
      "files": ["檔案名稱1", "檔案名稱2", ...]
    }
  ]
}

只回覆 JSON，不要包含其他文字。`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 嘗試解析 JSON（可能包含 markdown 代碼塊）
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);
    
    // 確保返回的格式正確
    if (parsed.assignments && Array.isArray(parsed.assignments)) {
      // 獲取所有有效的檔案名稱（用於驗證）
      const validFileNames = new Set(files.map(f => f.label));
      
      return parsed.assignments.map((assignment: any) => {
        // 清理檔案名稱：移除可能的類型信息，只保留檔案名稱
        const cleanedFiles = (Array.isArray(assignment.files) ? assignment.files : [])
          .map((fileName: string) => {
            // 移除可能的類型信息，例如 "檔案名 (類型: app)" -> "檔案名"
            let cleaned = fileName.trim();
            // 移除括號及其內容，例如 "檔案名 (app)" -> "檔案名"
            cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
            // 移除 "類型:" 相關文字
            cleaned = cleaned.replace(/\s*類型:\s*[^)]*/, '');
            cleaned = cleaned.trim();
            
            // 驗證檔案名稱是否存在於有效列表中
            if (validFileNames.has(cleaned)) {
              return cleaned;
            }
            // 如果清理後的名稱不存在，嘗試原始名稱
            if (validFileNames.has(fileName.trim())) {
              return fileName.trim();
            }
            return null;
          })
          .filter((name: string | null): name is string => name !== null);
        
        return {
          tagName: assignment.tagName || '',
          files: cleanedFiles,
        };
      });
    }

    throw new Error('API 返回格式不正確');
  } catch (error) {
    console.error('分配檔案時發生錯誤:', error);
    throw error;
  }
}

/**
 * 生成隨機顏色（用於新標籤）
 */
function getRandomColor(): string {
  const colors = [
    '#60a5fa', // blue
    '#4ade80', // green
    '#fbbf24', // yellow
    '#f87171', // red
    '#a78bfa', // purple
    '#fb923c', // orange
    '#34d399', // teal
    '#f472b6', // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

