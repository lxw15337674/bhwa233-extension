import { getApiConfig } from './config';

interface MemoLink {
    url: string;
    text?: string;
}

interface MemoTag {
    id: string;
    name: string;
    createdAt: string;
}

interface Memo {
    id: string;
    content: string;
    images: string[];
    link: MemoLink | null;
    tags: MemoTag[];
    createdAt: string;
    updatedAt: string;
}

interface CreateMemoRequest {
    content: string;
    images?: string[];
    link?: MemoLink;
    tags?: string[];
}

interface MemoResponse {
    success: boolean;
    data?: Memo;
    error?: string;
    message?: string;
    timestamp: string;
}

export class MemoService {
    private static async makeRequest(url: string, options: RequestInit, apiKey: string): Promise<MemoResponse> {
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            ...options.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('MemoService request failed:', error);
            throw error;
        }
    }

    /**
     * 创建新的 memo
     */
    static async createMemo(memoData: CreateMemoRequest): Promise<Memo | null> {
        try {
            const config = await getApiConfig();

            const response = await this.makeRequest(
                `${config.MEMO_API_URL}/api/memos`,
                {
                    method: 'POST',
                    body: JSON.stringify(memoData),
                },
                config.MEMO_API_KEY,
            );

            if (response.success && response.data) {
                console.log('Memo created successfully:', response.data);
                return response.data;
            } else {
                console.error('Failed to create memo:', response.error);
                return null;
            }
        } catch (error) {
            console.error('Error creating memo:', error);
            throw error;
        }
    }

    /**
     * 获取单个 memo
     */
    static async getMemo(id: string): Promise<Memo | null> {
        try {
            const config = await getApiConfig();

            const response = await this.makeRequest(
                `${config.MEMO_API_URL}/api/memos/${id}`,
                {
                    method: 'GET',
                },
                config.MEMO_API_KEY,
            );

            if (response.success && response.data) {
                return response.data;
            } else {
                console.error('Failed to get memo:', response.error);
                return null;
            }
        } catch (error) {
            console.error('Error getting memo:', error);
            throw error;
        }
    }

    /**
     * 更新 memo
     */
    static async updateMemo(id: string, memoData: Partial<CreateMemoRequest>): Promise<Memo | null> {
        try {
            const config = await getApiConfig();

            const response = await this.makeRequest(
                `${config.MEMO_API_URL}/api/memos/${id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(memoData),
                },
                config.MEMO_API_KEY,
            );

            if (response.success && response.data) {
                console.log('Memo updated successfully:', response.data);
                return response.data;
            } else {
                console.error('Failed to update memo:', response.error);
                return null;
            }
        } catch (error) {
            console.error('Error updating memo:', error);
            throw error;
        }
    }

    /**
     * 删除 memo
     */
    static async deleteMemo(id: string): Promise<boolean> {
        try {
            const config = await getApiConfig();

            const response = await this.makeRequest(
                `${config.MEMO_API_URL}/api/memos/${id}`,
                {
                    method: 'DELETE',
                },
                config.MEMO_API_KEY,
            );

            if (response.success) {
                console.log('Memo deleted successfully');
                return true;
            } else {
                console.error('Failed to delete memo:', response.error);
                return false;
            }
        } catch (error) {
            console.error('Error deleting memo:', error);
            throw error;
        }
    }
}

// 导出类型定义，供其他模块使用
export type { Memo, MemoLink, MemoTag, CreateMemoRequest };
