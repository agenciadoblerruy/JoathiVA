<?php
/**
 * Template Name: Home Page
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package packers_agency
 */
get_header();
?>
<main id="main" class="site-main" role="main">

	<?php get_template_part( 'sections/section-featured-banner' );
	get_template_part( 'sections/section-joathiva-portal' );

	get_template_part( 'sections/section-featured-classes' ); ?>

	<?php 
	while ( have_posts() ) : the_post(); ?> 
		<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
			<div class="container">
		        <div class="entry-content" itemprop="text">
		            <?php the_content(); ?> 
		        </div>
		    </div>
		</article>
	<?php endwhile; ?>
</main>
<?php
get_footer();
