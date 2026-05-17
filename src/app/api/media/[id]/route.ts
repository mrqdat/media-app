import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
    }

    // Get the media item to find public_id
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('public_id')
      .eq('id', id)
      .single();

    if (fetchError || !mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Delete from Cloudinary if public_id exists
    if (mediaItem.public_id) {
      await cloudinary.uploader.destroy(mediaItem.public_id);
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/media/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
