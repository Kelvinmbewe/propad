import { NextResponse } from 'next/server';
import { AgentSummarySchema } from '@propad/sdk';
import { mockAgents } from '../../../data';

export async function GET() {
  return NextResponse.json(AgentSummarySchema.array().parse(mockAgents));
}
