import { NextResponse } from 'next/server';
import { PropertySchema } from '@propad/sdk';
import { mockProperties } from '../../data';

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  const property = mockProperties.find((item) => item.id === params.id);

  if (!property) {
    return NextResponse.json({ message: 'Property not found' }, { status: 404 });
  }

  return NextResponse.json(PropertySchema.parse(property));
}
