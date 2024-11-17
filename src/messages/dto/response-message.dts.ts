export class ResponseMessageDto {
  message: string;
  read: boolean;
  created_at?: Date;
  updated_at?: Date;
  sender: {
    id: number;
    name: string;
  };
  receiver: {
    id: number;
    name: string;
  };
}
