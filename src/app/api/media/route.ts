import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');

    let query = supabase.from('media_items').select('*').order('created_at', { ascending: false });

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/media error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const locationId = formData.get('location_id') as string;
    const title = formData.get('title') as string;

    if (!file || !locationId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields (file, location_id, title)' },
        { status: 400 }
      );
    }

    // Convert file to base64 for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const fileUri = `data:${file.type};base64,${base64Data}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileUri, {
      folder: 'media_app',
    });

    const imageUrl = uploadResponse.secure_url;
    const publicId = uploadResponse.public_id;

    // Save to Supabase
    const { data, error } = await supabase
      .from('media_items')
      .insert([
        {
          location_id: locationId,
          title,
          image_url: imageUrl,
          public_id: publicId,
        },
      ])
      .select()
      .single();

    if (error) {
      // Rollback cloudinary upload if db insert fails
      await cloudinary.uploader.destroy(publicId);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/media error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
