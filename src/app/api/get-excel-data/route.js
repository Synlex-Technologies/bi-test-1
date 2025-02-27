// File: app/api/get-excel-data/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    // Adjust the path to where your Excel file is stored
    const filePath = path.join(process.cwd(), 'public', 'data', 'Merged_Invoice_Ledger_Stock.xlsx');
    
    // Read the file
    const data = await fs.readFile(filePath);
    
    // Return the file as an ArrayBuffer
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'inline; filename=Merged_Invoice_Ledger_Stock.xlsx'
      }
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return NextResponse.json(
      { error: 'Failed to load Excel data' },
      { status: 500 }
    );
  }
}