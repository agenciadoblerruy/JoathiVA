<?php
/**
 * Template part for displaying posts.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package packers_agency
 */
$packers_agency_heading_setting  = get_theme_mod( 'packers_agency_post_heading_setting' , true );
$packers_agency_meta_setting  = get_theme_mod( 'packers_agency_post_meta_setting' , true );
$packers_agency_content_setting  = get_theme_mod( 'packers_agency_post_content_setting' , true );
?>

<article class="wow zoomInUp delay-1000" data-wow-duration="2s" id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
	<header class="entry-header">
		<?php
		  if ( $packers_agency_heading_setting ){ 
			if ( is_single() ) {
				the_title( '<h1 class="entry-title" itemprop="headline">', '</h1>' );
			} else {
				the_title( '<h2 class="entry-title" itemprop="headline"><a href="' . esc_url( get_permalink() ) . '" rel="bookmark">', '</a></h2>' );
			}
		  }

		if ( 'post' === get_post_type() ) : ?>
		<?php
		if ( $packers_agency_meta_setting ){ ?>
			<div class="entry-meta">
				<?php packers_agency_posted_on(); ?>
			</div><!-- .entry-meta -->
		<?php } ?>
		<?php
		endif; ?>
	</header><!-- .entry-header -->
	 <?php
			// Get the post ID
			$packers_agency_post_id = get_the_ID();

			// Check if there are videos embedded in the post content
			$packers_agency_post = get_post($packers_agency_post_id);
			$packers_agency_content = do_shortcode(apply_filters('the_content', $packers_agency_post->post_content));
			$packers_agency_embeds = get_media_embedded_in_content($packers_agency_content);

			if (!empty($packers_agency_embeds)) {
			    // Loop through embedded media and display videos
			    foreach ($packers_agency_embeds as $embed) {
			        // Check if the embed code contains a video tag or specific video providers like YouTube or Vimeo
			        if (strpos($embed, 'video') !== false || strpos($embed, 'youtube') !== false || strpos($embed, 'vimeo') !== false || strpos($embed, 'dailymotion') !== false || strpos($embed, 'vine') !== false || strpos($embed, 'wordPress.tv') !== false || strpos($embed, 'hulu') !== false) {
			            ?>
			            <div class="custom-embedded-video">
			                <div class="video-container">
			                    <?php echo $embed; ?>
			                </div>
			                <div class="video-comments">
			                    <?php
			                    // Add your comments section here
			                    comments_template(); // This will include the default WordPress comments template
			                    ?>
			                </div>
			            </div>
			            <?php
			        }
			    }
			}
	    ?>
    <?php
	if ( $packers_agency_content_setting ){ ?>
		<div class="entry-content" itemprop="text">
			<?php
			if( is_single()){
				the_content( sprintf(
					/* translators: %s: Name of current post. */
					wp_kses( __( 'Continue reading %s <span class="meta-nav">&rarr;</span>', 'packers-agency' ), array( 'span' => array( 'class' => array() ) ) ),
					the_title( '<span class="screen-reader-text">"', '"</span>', false )
				) );
				}else{
				the_excerpt();
				}
				wp_link_pages( array(
					'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'packers-agency' ),
					'after'  => '</div>',
				) );
			?>
		</div><!-- .entry-content -->
    <?php } ?>
</article><!-- #post-## -->