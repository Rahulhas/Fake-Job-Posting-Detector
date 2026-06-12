import mongoose, { Schema, Document } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  inputType: 'text' | 'url';
  inputValue: string;
  fraudScore: number;
  verdict: string;
  redFlags: string[];
  recommendation: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  salaryDetails?: {
    amount: string;
    benchmarkAssessment: string;
    isReasonable: boolean;
  };
  companyVerification?: {
    isLikelyRegistered: boolean;
    explanation: string;
  };
  campaignRisk?: {
    isCampaign: boolean;
    similarPostingsCount: number;
  };
  createdAt: Date;
}

const HistorySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  inputType: {
    type: String,
    enum: ['text', 'url'],
    required: true,
  },
  inputValue: {
    type: String,
    required: true,
  },
  fraudScore: {
    type: Number,
    required: true,
  },
  verdict: {
    type: String,
    required: true,
  },
  redFlags: {
    type: [String],
    default: [],
  },
  recommendation: {
    type: String,
  },
  companyName: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  salaryDetails: {
    amount: { type: String },
    benchmarkAssessment: { type: String },
    isReasonable: { type: Boolean }
  },
  companyVerification: {
    isLikelyRegistered: { type: Boolean },
    explanation: { type: String }
  },
  campaignRisk: {
    isCampaign: { type: Boolean },
    similarPostingsCount: { type: Number }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.History || mongoose.model<IHistory>("History", HistorySchema);
