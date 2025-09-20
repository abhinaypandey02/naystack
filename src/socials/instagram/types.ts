export type InstagramMessage = {
  id: string;
  created_time: string;
  from: { id: string; username: string };
  to: {
    data: {
      username: string;
      id: string;
    }[];
  };
  message: string;
};
export type InstagramUser = {
  username: string;
  followers_count: number;
  media_count: number;
};

export type InstagramMedia = {
  like_count?: number;
  comments_count: number;
  permalink: string;
};

export type InstagramConversation = {
  id: string;
  updated_time: string;
  messages?: {
    data: { id: string; created_time: string }[];
    paging: { cursors?: { after?: string } };
  };
  participants?: {
    data: { id: string; username: string }[];
  };
};

export type InstagramError = {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    fbtrace_id: string;
  };
};
