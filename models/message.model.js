import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    message:{
        type:String,
        required: function() {
            // Only require message if no file is attached
            return !this.fileUrl;
        },
        default: ""
    },
    isRead: {
        type: Boolean,
        default: false
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileType: {
        type: String,
        enum: ['image', 'document', null],
        default: null
    },
    fileName: {
        type: String,
        default: null
    }
}, { timestamps: true });

export const Message = mongoose.model("Message",messageSchema);