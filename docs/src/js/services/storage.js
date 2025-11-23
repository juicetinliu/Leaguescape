/**
 * Too lazy to deal with Supabase auth AND firebase storage is no longer guaranteed free >:( . Using public Supabase storage to store images.
 * 
 * Images are basically only used for character profiles/emblems. See usage in GameService!
 */

class StorageService {
    constructor() {
        this.supabaseClient = null;
        this.supabaseProjectUrl = 'https://mwuiztkrrprskbdqqwtl.supabase.co';
        this.supabaseApiKey = 'sb_publishable_-fAk2hlG3lFr-PcSAh8pcw_JdyoJmfO';
        this.supabaseStorageBucket = 'Leaguescape';
    }

    async init() {
        // Create a single supabase client for interacting with your database
        this.supabaseClient = supabase.createClient(this.supabaseProjectUrl, this.supabaseApiKey);
        console.log(this.supabaseClient);
    }

    async uploadFile(filePath, file) {
        const { data, error } = await this.supabaseClient.storage.from(this.supabaseStorageBucket).upload(filePath, file);
        if (error) {
            console.error(error);
        } else {
            const url = await this.getFileUrl(filePath);
            return url;
        }
    }

    //unused?
    async getFileUrl(filePath) {
        const { data } = this.supabaseClient.storage.from(this.supabaseStorageBucket).getPublicUrl(filePath)
        return data.publicUrl;
    }
}

export default new StorageService();